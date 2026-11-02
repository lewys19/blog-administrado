"""Boletín: suscripción con doble confirmación, baja con un clic y envío de un artículo a los confirmados.

Para no revelar quién está suscrito, suscribirse responde siempre lo mismo. Cada correo lleva el
enlace para darse de baja y la cabecera List-Unsubscribe (Gmail y otros muestran «Cancelar suscripción»).
"""

import csv
import hashlib
import io
from collections.abc import Iterator
from datetime import timedelta
from html import escape

import redis
from fastapi import status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, sessionmaker

from app.almacen import Almacen
from app.core.cache import cliente_redis
from app.core.config import settings
from app.core.correo import Correo, enviar, enviar_varios
from app.core.errores import ErrorNegocio
from app.core.fechas import ahora
from app.models import Articulo, Envio, EstadoEnvio, EstadoSuscriptor, Suscriptor, Usuario
from app.schemas.newsletter import (
    ArticuloParaEnviar,
    ConteoSuscriptores,
    EnvioOut,
    EstadoSuscriptor as EstadoLiteral,
    PaginaSuscriptores,
    SuscriptorOut,
)
from app.services.articulos import visible

GRACIAS = "¡Listo! Te enviamos un correo: abre el enlace para confirmar tu suscripción."
ESPERA_AVISO = timedelta(minutes=10)  # no reenviar la confirmación más seguido que esto
LOTE = 50  # cada cuántos correos se guarda el avance de un envío


def _url(ruta: str) -> str:
    return f"{settings.SITIO_URL.rstrip('/')}{ruta}"


def _demasiadas(ip: str) -> bool:
    try:
        huella = hashlib.sha256(f"{settings.SECRET_KEY}|boletin|{ip}".encode()).hexdigest()[:16]
        clave = f"boletin:ip:{huella}:{int(ahora().timestamp() // 3600)}"
        cliente = cliente_redis()
        cuenta = cliente.incr(clave)
        if cuenta == 1:
            cliente.expire(clave, 3600)
        return int(cuenta) > settings.MAX_SUSCRIPCIONES_POR_HORA  # type: ignore[arg-type]
    except redis.RedisError:
        return False


# ---------- Plantillas de correo ----------

VERDE, OSCURO, GRIS = "#1f9d57", "#0f2a1d", "#52685b"


def _marco(contenido: str, pie: str) -> str:
    """HTML de correo: tablas y estilos en línea (los programas de correo ignoran las hojas de estilo)."""
    return f"""<!doctype html><html lang="es"><body style="margin:0;background:#f4f8f5;font-family:Arial,Helvetica,sans-serif;color:#13241b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbe5dd">
<tr><td style="background:{OSCURO};padding:18px 28px;color:#ffffff;font-size:20px;font-weight:bold">zcorp-stack
<span style="display:block;font-size:12px;font-weight:normal;color:#cfe3d6">Tecnología · IA · Programación</span></td></tr>
<tr><td style="padding:28px">{contenido}</td></tr>
<tr><td style="padding:18px 28px;background:#f4f8f5;font-size:12px;color:{GRIS}">{pie}</td></tr>
</table></td></tr></table></body></html>"""


def _boton(url: str, texto: str) -> str:
    return (
        f'<a href="{escape(url)}" style="display:inline-block;background:{VERDE};color:#ffffff;text-decoration:none;'
        f'font-weight:bold;padding:12px 22px;border-radius:10px">{escape(texto)}</a>'
    )


def _correo_confirmacion(s: Suscriptor) -> Correo:
    url = _url(f"/newsletter/confirmar?token={s.token}")
    html = _marco(
        "<h1 style=\"font-size:22px;margin:0 0 12px\">Confirma tu suscripción</h1>"
        "<p style=\"line-height:1.6\">Alguien (seguramente tú) pidió recibir el boletín de zcorp-stack en este correo. "
        "Confirma con el botón y te avisaremos de cada artículo nuevo.</p>"
        f"<p style=\"margin:24px 0\">{_boton(url, 'Confirmar suscripción')}</p>",
        "Si no fuiste tú, ignora este mensaje: sin confirmar no te escribiremos.",
    )
    texto = f"Confirma tu suscripción al boletín de zcorp-stack:\n{url}\n\nSi no fuiste tú, ignora este mensaje."
    return Correo(para=s.correo, asunto="Confirma tu suscripción a zcorp-stack", texto=texto, html=html)


def _correo_articulo(a: Articulo, imagen: str | None, s: Suscriptor) -> Correo:
    leer = _url(f"/{'guias' if a.tipo == 'guia' else 'blog'}/{a.slug}")
    baja = _url(f"/newsletter/baja?token={s.token}")
    foto = (
        f'<a href="{escape(leer)}"><img src="{escape(imagen)}" alt="" width="504" '
        'style="width:100%;height:auto;border-radius:12px;margin-bottom:18px"></a>'
        if imagen
        else ""
    )
    resumen = f'<p style="line-height:1.6;color:{GRIS}">{escape(a.resumen)}</p>' if a.resumen else ""
    html = _marco(
        f'<p style="margin:0 0 8px;font-size:12px;color:{VERDE};font-weight:bold;text-transform:uppercase">'
        "Nuevo artículo</p>"
        f'{foto}<h1 style="font-size:24px;line-height:1.3;margin:0 0 10px">{escape(a.titulo)}</h1>{resumen}'
        f'<p style="margin:24px 0 4px">{_boton(leer, "Leer el artículo")}</p>',
        f'Recibes esto porque te suscribiste al boletín de zcorp-stack. <a href="{escape(baja)}" style="color:{GRIS}">'
        "Darme de baja</a>",
    )
    texto = f"Nuevo artículo en zcorp-stack: {a.titulo}\n\n{a.resumen or ''}\n\nLéelo aquí: {leer}\n\nDarte de baja: {baja}"
    return Correo(
        para=s.correo, asunto=a.titulo, texto=texto, html=html,
        cabeceras={
            "List-Unsubscribe": f"<{_url(f'/api/v1/newsletter/baja/{s.token}')}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    )  # fmt: skip


# ---------- Público ----------


def suscribir(db: Session, correo: str, trampa: str | None, ip: str) -> str:
    if trampa:
        return GRACIAS
    if _demasiadas(ip):
        raise ErrorNegocio(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados intentos seguidos. Espera un rato.")
    correo = correo.lower()
    s = db.scalar(select(Suscriptor).where(Suscriptor.correo == correo))
    if s is None:
        s = Suscriptor(correo=correo)
        db.add(s)
    elif s.estado == EstadoSuscriptor.CONFIRMADO:
        return GRACIAS  # ya está: no se le escribe ni se revela
    elif s.aviso_enviado_en and ahora() - s.aviso_enviado_en < ESPERA_AVISO:
        return GRACIAS  # se le acaba de enviar: no se inunda su bandeja
    s.estado = EstadoSuscriptor.PENDIENTE
    s.aviso_enviado_en = ahora()
    db.commit()
    enviar(_correo_confirmacion(s))
    return GRACIAS


def _por_token(db: Session, token: str) -> Suscriptor:
    s = db.scalar(select(Suscriptor).where(Suscriptor.token == token))
    if s is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "El enlace no es válido o ya no existe.")
    return s


def confirmar(db: Session, token: str) -> str:
    s = _por_token(db, token)
    if s.estado != EstadoSuscriptor.CONFIRMADO:
        s.estado, s.confirmado_en, s.baja_en = EstadoSuscriptor.CONFIRMADO, ahora(), None
        db.commit()
    return f"¡Suscripción confirmada! Te escribiremos a {s.correo} con cada artículo nuevo."


def baja(db: Session, token: str) -> str:
    s = _por_token(db, token)
    if s.estado != EstadoSuscriptor.BAJA:
        s.estado, s.baja_en = EstadoSuscriptor.BAJA, ahora()
        db.commit()
    return f"Listo: {s.correo} ya no recibirá el boletín."


# ---------- Panel ----------


def _filtrar(consulta: Select, q: str | None) -> Select:
    return consulta.where(Suscriptor.correo.ilike(f"%{q.strip().lower()}%")) if q and q.strip() else consulta


def _fila(s: Suscriptor) -> SuscriptorOut:
    return SuscriptorOut(
        id=s.id, correo=s.correo, estado=s.estado, creado_en=s.creado_en,  # type: ignore[arg-type]
        confirmado_en=s.confirmado_en, baja_en=s.baja_en,
    )  # fmt: skip


def listar(db: Session, estado: EstadoLiteral, q: str | None, pagina: int, por_pagina: int) -> PaginaSuscriptores:
    conteos = dict(db.execute(_filtrar(select(Suscriptor.estado, func.count()), q).group_by(Suscriptor.estado)).all())
    nuevos = db.scalar(
        select(func.count()).where(
            Suscriptor.estado == EstadoSuscriptor.CONFIRMADO, Suscriptor.confirmado_en >= ahora() - timedelta(days=30)
        )
    )
    orden = {
        "confirmado": Suscriptor.confirmado_en.desc(),
        "pendiente": Suscriptor.creado_en.desc(),
        "baja": Suscriptor.baja_en.desc(),
    }[estado]
    filas = db.scalars(
        _filtrar(select(Suscriptor), q)
        .where(Suscriptor.estado == estado)
        .order_by(orden, Suscriptor.id.desc())
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
    ).all()
    return PaginaSuscriptores(
        total=conteos.get(estado, 0), pagina=pagina, por_pagina=por_pagina,
        conteo=ConteoSuscriptores(
            confirmado=conteos.get("confirmado", 0), pendiente=conteos.get("pendiente", 0),
            baja=conteos.get("baja", 0), nuevos_30d=nuevos or 0,
        ),
        suscriptores=[_fila(s) for s in filas],
    )  # fmt: skip


def eliminar(db: Session, id_: int) -> None:
    s = db.get(Suscriptor, id_)
    if s is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Suscriptor no encontrado.")
    db.delete(s)
    db.commit()


def csv_confirmados(db: Session) -> str:
    salida = io.StringIO()
    hoja = csv.writer(salida)
    hoja.writerow(["correo", "confirmado_en"])
    for correo, fecha in db.execute(
        select(Suscriptor.correo, Suscriptor.confirmado_en)
        .where(Suscriptor.estado == EstadoSuscriptor.CONFIRMADO)
        .order_by(Suscriptor.confirmado_en)
    ):
        hoja.writerow([correo, fecha.isoformat() if fecha else ""])
    return salida.getvalue()


def para_enviar(db: Session) -> list[ArticuloParaEnviar]:
    """Los 30 publicados más recientes y la última vez que cada uno salió en el boletín."""
    ultimo = (
        select(Envio.articulo_id, func.max(Envio.creado_en).label("en"))
        .where(Envio.estado != EstadoEnvio.ERROR)
        .group_by(Envio.articulo_id)
        .subquery()
    )
    filas = db.execute(
        select(Articulo, ultimo.c.en)
        .outerjoin(ultimo, ultimo.c.articulo_id == Articulo.id)
        .where(visible())
        .order_by(Articulo.publicado_en.desc())
        .limit(30)
    ).all()
    return [
        ArticuloParaEnviar(id=a.id, titulo=a.titulo, slug=a.slug, publicado_en=a.publicado_en, enviado_en=en)
        for a, en in filas
    ]


def _articulo(db: Session, articulo_id: int) -> Articulo:
    a = db.scalar(select(Articulo).where(Articulo.id == articulo_id, visible()))
    if a is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Solo se envían artículos publicados.")
    return a


def _imagen(a: Articulo, almacen: Almacen) -> str | None:
    return _url(almacen.url(a.imagen_clave)) if a.imagen_clave else None


def prueba(db: Session, almacen: Almacen, articulo_id: int, quien: Usuario) -> str:
    """El mismo correo, solo a quien está en el panel (para revisarlo antes de mandarlo a todos)."""
    a = _articulo(db, articulo_id)
    muestra = Suscriptor(correo=quien.email, token="prueba")
    correo = _correo_articulo(a, _imagen(a, almacen), muestra)
    correo.asunto = f"[Prueba] {correo.asunto}"
    if not enviar(correo):
        raise ErrorNegocio(status.HTTP_502_BAD_GATEWAY, "El servidor de correo no respondió. Revisa la configuración SMTP.")
    return f"Te enviamos la prueba a {quien.email}."


def iniciar_envio(db: Session, articulo_id: int, quien: Usuario) -> Envio:
    a = _articulo(db, articulo_id)
    if db.scalar(select(func.count()).where(Envio.estado == EstadoEnvio.ENVIANDO)):
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Ya hay un envío en curso. Espera a que termine.")
    total = db.scalar(select(func.count()).where(Suscriptor.estado == EstadoSuscriptor.CONFIRMADO)) or 0
    if not total:
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Todavía no hay suscriptores confirmados.")
    envio = Envio(articulo_id=a.id, autor_id=quien.id, asunto=a.titulo, total=total)
    db.add(envio)
    db.commit()
    db.refresh(envio)
    return envio


def _confirmados(db: Session) -> Iterator[Suscriptor]:
    ultimo = 0
    while True:
        lote = db.scalars(
            select(Suscriptor)
            .where(Suscriptor.estado == EstadoSuscriptor.CONFIRMADO, Suscriptor.id > ultimo)
            .order_by(Suscriptor.id)
            .limit(LOTE)
        ).all()
        if not lote:
            return
        yield from lote
        ultimo = lote[-1].id


def repartir(fabrica: sessionmaker[Session], almacen: Almacen, envio_id: int) -> None:
    """Corre en segundo plano, después de responder al panel. Guarda el avance cada LOTE correos."""
    with fabrica() as db:
        envio = db.get(Envio, envio_id)
        if envio is None or envio.articulo is None:
            return
        a, imagen = envio.articulo, _imagen(envio.articulo, almacen)
        try:
            pendientes: list[Correo] = []
            for s in _confirmados(db):
                pendientes.append(_correo_articulo(a, imagen, s))
                if len(pendientes) == LOTE:
                    ok, mal = enviar_varios(pendientes)
                    envio.enviados, envio.fallidos = envio.enviados + ok, envio.fallidos + mal
                    db.commit()
                    pendientes = []
            ok, mal = enviar_varios(pendientes)
            envio.enviados, envio.fallidos = envio.enviados + ok, envio.fallidos + mal
            envio.estado = EstadoEnvio.ENVIADO
        except Exception:  # noqa: BLE001 — el servidor de correo cayó: se marca y se puede reintentar
            envio.estado = EstadoEnvio.ERROR
        envio.terminado_en = ahora()
        db.commit()


def envios(db: Session) -> list[EnvioOut]:
    filas = db.scalars(select(Envio).order_by(Envio.creado_en.desc(), Envio.id.desc()).limit(20)).all()
    return [
        EnvioOut(
            id=e.id, asunto=e.asunto, articulo_slug=e.articulo.slug if e.articulo else None,
            estado=e.estado, total=e.total, enviados=e.enviados, fallidos=e.fallidos,  # type: ignore[arg-type]
            creado_en=e.creado_en, terminado_en=e.terminado_en,
        )  # fmt: skip
        for e in filas
    ]


def confirmados(db: Session) -> int:
    return db.scalar(select(func.count()).where(Suscriptor.estado == EstadoSuscriptor.CONFIRMADO)) or 0


