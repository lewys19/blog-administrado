"""Comentarios: los lectores escriben sin cuenta y un moderador decide qué se publica.

Reglas contra el spam, de la más barata a la más cara:
- trampa oculta (`sitio_web`): si viene llena es un robot; se le responde «enviado» y no se guarda;
- máximo MAX_COMENTARIOS_POR_HORA por IP;
- quien ya fue marcado como spam (misma huella o mismo correo) va directo a spam;
- más de 2 enlaces en el texto: spam.
Quien ya tiene un comentario aprobado con ese correo se publica al instante.
"""

import hashlib
import re
from datetime import timedelta

import redis
from fastapi import status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.cache import cliente_redis
from app.core.config import settings
from app.core.errores import ErrorNegocio
from app.core.fechas import ahora
from app.models import Articulo, Comentario, EstadoComentario
from app.schemas.comentario import (
    ComentarioEnviado,
    ComentarioIn,
    ComentarioPanel,
    ComentarioPublico,
    ConteoComentarios,
    Estado,
    PaginaComentarios,
)
from app.schemas.contenido import Corto
from app.services.articulos import visible

ENLACE = re.compile(r"https?://|www\.", re.IGNORECASE)
MENSAJES = {
    EstadoComentario.APROBADO: "¡Gracias! Tu comentario ya está publicado.",
    EstadoComentario.PENDIENTE: "¡Gracias! Tu comentario se publicará cuando lo revisemos.",
    # Al spam se le responde igual que a un pendiente: no le decimos que lo detectamos.
    EstadoComentario.SPAM: "¡Gracias! Tu comentario se publicará cuando lo revisemos.",
}


def _huella(ip: str) -> str:
    return hashlib.sha256(f"{settings.SECRET_KEY}|comentario|{ip}".encode()).hexdigest()[:16]


def _demasiados(ip: str) -> bool:
    try:
        clave = f"comentarios:ip:{_huella(ip)}:{int(ahora().timestamp() // 3600)}"
        cliente = cliente_redis()
        cuenta = cliente.incr(clave)
        if cuenta == 1:
            cliente.expire(clave, 3600)
        return int(cuenta) > settings.MAX_COMENTARIOS_POR_HORA  # type: ignore[arg-type]
    except redis.RedisError:
        return False


def _articulo_visible(db: Session, slug: str) -> Articulo:
    a = db.scalar(select(Articulo).where(Articulo.slug == slug, visible()))
    if a is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Artículo no encontrado.")
    return a


def _estado_inicial(db: Session, datos: ComentarioIn, correo: str, huella: str) -> EstadoComentario:
    previos = select(func.count()).select_from(Comentario)
    marcado = previos.where(
        Comentario.estado == EstadoComentario.SPAM,
        or_(Comentario.huella == huella, Comentario.correo == correo),
        Comentario.creado_en >= ahora() - timedelta(days=90),
    )
    if db.scalar(marcado) or len(ENLACE.findall(datos.contenido)) > 2:
        return EstadoComentario.SPAM
    conocido = previos.where(Comentario.estado == EstadoComentario.APROBADO, Comentario.correo == correo)
    return EstadoComentario.APROBADO if db.scalar(conocido) else EstadoComentario.PENDIENTE


def crear(db: Session, slug: str, datos: ComentarioIn, ip: str) -> ComentarioEnviado:
    articulo = _articulo_visible(db, slug)
    if datos.sitio_web:
        return ComentarioEnviado(estado="pendiente", mensaje=MENSAJES[EstadoComentario.PENDIENTE])
    if _demasiados(ip):
        raise ErrorNegocio(status.HTTP_429_TOO_MANY_REQUESTS, "Enviaste varios comentarios seguidos. Espera un rato.")
    correo, huella = datos.correo.lower(), _huella(ip)
    estado = _estado_inicial(db, datos, correo, huella)
    db.add(
        Comentario(
            articulo_id=articulo.id, nombre=datos.nombre, correo=correo, contenido=datos.contenido,
            estado=estado, huella=huella, moderado_en=ahora() if estado == EstadoComentario.APROBADO else None,
        )  # fmt: skip
    )
    db.commit()
    publico = EstadoComentario.APROBADO if estado == EstadoComentario.APROBADO else EstadoComentario.PENDIENTE
    return ComentarioEnviado(estado=publico.value, mensaje=MENSAJES[estado])  # type: ignore[arg-type]


def publicos(db: Session, slug: str) -> list[ComentarioPublico]:
    articulo = _articulo_visible(db, slug)
    filas = db.scalars(
        select(Comentario)
        .where(Comentario.articulo_id == articulo.id, Comentario.estado == EstadoComentario.APROBADO)
        .order_by(Comentario.creado_en)
    ).all()
    return [ComentarioPublico(id=c.id, nombre=c.nombre, contenido=c.contenido, creado_en=c.creado_en) for c in filas]


def contar_aprobados(db: Session, articulo_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(Comentario)
        .where(Comentario.articulo_id == articulo_id, Comentario.estado == EstadoComentario.APROBADO)
    ) or 0  # fmt: skip


def pendientes(db: Session) -> int:
    return db.scalar(select(func.count()).where(Comentario.estado == EstadoComentario.PENDIENTE)) or 0


# ---------- Panel ----------


def _filtrar(consulta: Select, q: str | None) -> Select:
    if q and q.strip():
        patron = f"%{q.strip()}%"
        consulta = consulta.join(Comentario.articulo).where(
            or_(
                Comentario.nombre.ilike(patron), Comentario.correo.ilike(patron),
                Comentario.contenido.ilike(patron), Articulo.titulo.ilike(patron),
            )
        )  # fmt: skip
    return consulta


def listar(db: Session, estado: Estado, q: str | None, pagina: int, por_pagina: int) -> PaginaComentarios:
    base = _filtrar(select(Comentario), q)
    conteos = dict(db.execute(_filtrar(select(Comentario.estado, func.count()), q).group_by(Comentario.estado)).all())
    filas = db.scalars(
        base.where(Comentario.estado == estado)
        .options(joinedload(Comentario.articulo))
        .order_by(Comentario.creado_en.desc(), Comentario.id.desc())
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
    ).all()
    return PaginaComentarios(
        total=conteos.get(estado, 0),
        pagina=pagina,
        por_pagina=por_pagina,
        conteo=ConteoComentarios(**{e.value: conteos.get(e.value, 0) for e in EstadoComentario}),
        comentarios=[
            ComentarioPanel(
                id=c.id, nombre=c.nombre, contenido=c.contenido, creado_en=c.creado_en, correo=c.correo,
                estado=c.estado, articulo=Corto(nombre=c.articulo.titulo, slug=c.articulo.slug),  # type: ignore[arg-type]
            )  # fmt: skip
            for c in filas
        ],
    )


def _buscar(db: Session, id_: int) -> Comentario:
    c = db.get(Comentario, id_)
    if c is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Comentario no encontrado.")
    return c


def moderar(db: Session, id_: int, estado: Estado) -> None:
    c = _buscar(db, id_)
    c.estado = estado
    c.moderado_en = ahora()
    db.commit()


def eliminar(db: Session, id_: int) -> None:
    db.delete(_buscar(db, id_))
    db.commit()
