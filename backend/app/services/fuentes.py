"""Lee los RSS, guarda las noticias nuevas en la bandeja y las convierte en borradores.

Solo se guarda título, enlace y un extracto corto: el contenido sigue siendo de su autor, y el borrador
lo enlaza como fuente para que se redacte con palabras propias.
"""

import ipaddress
import re
import socket
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from time import struct_time
from urllib.parse import urlsplit

import feedparser
import nh3
from fastapi import status
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.almacen import Almacen
from app.core.errores import ErrorNegocio
from app.core.fechas import ahora
from app.models import Categoria, EstadoNoticia, Fuente, NoticiaFuente, Usuario
from app.schemas.contenido import ArticuloIn
from app.schemas.fuentes import (
    AvisoFuentes,
    BorradorCreado,
    FuenteIn,
    FuenteOut,
    NoticiaOut,
    PaginaNoticias,
    ResultadoLectura,
    ResultadoLote,
)
from app.services import articulos

AGENTE = "Mozilla/5.0 (compatible; zcorp-stack-lector/1.0)"
MAX_BYTES = 5 * 1024 * 1024
MAX_POR_FUENTE = 30
MAX_EXTRACTO = 500
TIEMPO_LIMITE = 12
HILOS = 5
DIAS_EN_BANDEJA = 30  # lo que no se usó en este tiempo se borra
DIAS_REPETIDAS = 14  # ventana para reconocer la misma noticia en otro sitio
PARECIDO = 0.75


class _SinRedireccion(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args: object, **_kwargs: object) -> None:
        return None  # cada salto se revisa a mano en _descargar


_abridor = urllib.request.build_opener(_SinRedireccion)


def _exigir_publica(url: str) -> None:
    """La API corre junto a la base y Redis: un RSS no puede apuntar a la red interna."""
    partes = urlsplit(url)
    if partes.scheme != "https" or not partes.hostname:
        raise ValueError("La dirección debe ser https.")
    try:
        direcciones = socket.getaddrinfo(partes.hostname, partes.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as error:
        raise ValueError("No se encontró ese dominio.") from error
    for direccion in direcciones:
        if not ipaddress.ip_address(direccion[4][0]).is_global:
            raise ValueError("Esa dirección no es pública.")


def _descargar(url: str) -> bytes:
    for _ in range(4):
        _exigir_publica(url)
        peticion = urllib.request.Request(url, headers={"User-Agent": AGENTE})
        try:
            with _abridor.open(peticion, timeout=TIEMPO_LIMITE) as respuesta:
                datos = respuesta.read(MAX_BYTES + 1)
        except urllib.error.HTTPError as error:
            destino = error.headers.get("Location")
            if error.code in (301, 302, 303, 307, 308) and destino:
                url = urllib.parse.urljoin(url, destino)
                continue
            raise ValueError(f"El sitio respondió {error.code}.") from error
        if len(datos) > MAX_BYTES:
            raise ValueError("El RSS es demasiado grande.")
        return datos
    raise ValueError("Demasiadas redirecciones.")


@dataclass
class _Entrada:
    titulo: str
    enlace: str
    extracto: str
    publicado_en: datetime | None


def _limpio(html: str, largo: int) -> str:
    texto = " ".join(nh3.clean(html, tags=set()).split())
    return (texto.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">"))[:largo].strip()


def _fecha(valor: struct_time | None) -> datetime | None:
    return datetime(*valor[:6], tzinfo=UTC) if valor else None


def _entradas(datos: bytes) -> list[_Entrada]:
    lectura = feedparser.parse(datos)
    if not lectura.entries and lectura.bozo:
        raise ValueError("No es un RSS válido.")
    entradas = []
    for e in lectura.entries[:MAX_POR_FUENTE]:
        enlace, titulo = str(e.get("link", "")).strip(), _limpio(str(e.get("title", "")), 300)
        if titulo and enlace.startswith(("https://", "http://")) and len(enlace) <= 700:
            extracto = _limpio(str(e.get("summary", "")), MAX_EXTRACTO)
            entradas.append(_Entrada(titulo, enlace, extracto, _fecha(e.get("published_parsed"))))
    return entradas


def _leer(url: str) -> list[_Entrada] | str:
    """Devuelve las entradas, o el motivo del fallo: una fuente caída no detiene a las demás."""
    try:
        return _entradas(_descargar(url))
    except (ValueError, OSError) as error:
        return str(error)[:300] or "No se pudo leer."


def _normal(texto: str) -> str:
    sin_tildes = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sin_tildes.lower()


def _coincide(palabras: str, texto: str) -> bool:
    """Sin palabras entra todo. Se compara por palabra completa: «IA» no coincide con «historia»."""
    buscadas = [_normal(p).strip() for p in palabras.split(",") if p.strip()]
    if not buscadas:
        return True
    return any(re.search(rf"\b{re.escape(b)}\b", _normal(texto)) for b in buscadas)


def _terminos(titulo: str) -> frozenset[str]:
    return frozenset(p for p in re.findall(r"\w+", _normal(titulo)) if len(p) > 2)


def _repetida(terminos: frozenset[str], vistas: list[frozenset[str]]) -> bool:
    """Misma noticia en otro sitio: casi las mismas palabras en el título."""
    if len(terminos) < 4:
        return False
    return any(len(terminos & v) / len(terminos | v) >= PARECIDO for v in vistas)


def _limpiar_bandeja(db: Session) -> None:
    db.execute(
        delete(NoticiaFuente).where(
            NoticiaFuente.estado != EstadoNoticia.USADA,
            NoticiaFuente.creado_en < ahora() - timedelta(days=DIAS_EN_BANDEJA),
        )
    )


def actualizar(db: Session, fuentes: Sequence[Fuente] | None = None) -> ResultadoLectura:
    lista = fuentes if fuentes is not None else db.scalars(select(Fuente).where(Fuente.activa.is_(True))).all()
    with ThreadPoolExecutor(HILOS) as hilos:
        resultados = list(hilos.map(_leer, [f.url for f in lista]))
    _limpiar_bandeja(db)
    desde = ahora() - timedelta(days=DIAS_REPETIDAS)
    titulos = db.scalars(select(NoticiaFuente.titulo).where(NoticiaFuente.creado_en >= desde)).all()
    vistas = [_terminos(t) for t in titulos]
    con_error = nuevas = 0
    for fuente, resultado in zip(lista, resultados, strict=True):
        fuente.leida_en = ahora()
        if isinstance(resultado, str):
            fuente.ultimo_error = resultado
            con_error += 1
            continue
        fuente.ultimo_error = None
        for e in resultado:
            terminos = _terminos(e.titulo)
            if not _coincide(fuente.palabras, f"{e.titulo} {e.extracto}") or _repetida(terminos, vistas):
                continue
            guardada = db.execute(
                insert(NoticiaFuente)
                .values(
                    fuente_id=fuente.id,
                    titulo=e.titulo,
                    enlace=e.enlace,
                    extracto=e.extracto,
                    publicado_en=e.publicado_en,
                )
                .on_conflict_do_nothing(index_elements=["enlace"])
                .returning(NoticiaFuente.id)
            ).first()
            if guardada is not None:
                nuevas += 1
                vistas.append(terminos)
    db.commit()
    return ResultadoLectura(leidas=len(lista) - con_error, con_error=con_error, nuevas=nuevas)


# ---------- Fuentes ----------


def _fuente(db: Session, fuente_id: int) -> Fuente:
    f = db.get(Fuente, fuente_id)
    if f is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Fuente no encontrada.")
    return f


def _salida(f: Fuente, nuevas: int = 0) -> FuenteOut:
    return FuenteOut(
        id=f.id,
        nombre=f.nombre,
        url=f.url,
        categoria_id=f.categoria_id,
        activa=f.activa,
        palabras=f.palabras,
        leida_en=f.leida_en,
        ultimo_error=f.ultimo_error,
        nuevas=nuevas,
    )


def listar(db: Session) -> list[FuenteOut]:
    conteo = dict(
        db.execute(
            select(NoticiaFuente.fuente_id, func.count())
            .where(NoticiaFuente.estado == EstadoNoticia.NUEVA)
            .group_by(NoticiaFuente.fuente_id)
        ).all()
    )
    return [_salida(f, conteo.get(f.id, 0)) for f in db.scalars(select(Fuente).order_by(Fuente.nombre)).all()]


def guardar(db: Session, datos: FuenteIn, fuente_id: int | None = None) -> FuenteOut:
    if datos.categoria_id is not None and db.get(Categoria, datos.categoria_id) is None:
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, "La categoría no existe.")
    f = _fuente(db, fuente_id) if fuente_id else Fuente()
    f.nombre, f.url, f.categoria_id = datos.nombre, datos.url, datos.categoria_id
    f.activa, f.palabras = datos.activa, datos.palabras
    db.add(f)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Esa dirección ya está en tus fuentes.") from error
    return _salida(f)


def aviso(db: Session) -> AvisoFuentes:
    nuevas = select(func.count()).select_from(NoticiaFuente).where(NoticiaFuente.estado == EstadoNoticia.NUEVA)
    errores = select(func.count()).select_from(Fuente).where(Fuente.activa.is_(True), Fuente.ultimo_error.is_not(None))
    return AvisoFuentes(nuevas=db.scalar(nuevas) or 0, con_error=db.scalar(errores) or 0)


def eliminar(db: Session, fuente_id: int) -> None:
    db.delete(_fuente(db, fuente_id))
    db.commit()


# ---------- Bandeja ----------


def bandeja(
    db: Session, estado: EstadoNoticia, fuente_id: int | None, pagina: int, por_pagina: int
) -> PaginaNoticias:
    filtro = [NoticiaFuente.estado == estado]
    if fuente_id:
        filtro.append(NoticiaFuente.fuente_id == fuente_id)
    total = db.scalar(select(func.count()).select_from(NoticiaFuente).where(*filtro)) or 0
    filas = db.scalars(
        select(NoticiaFuente)
        .options(joinedload(NoticiaFuente.fuente))
        .where(*filtro)
        .order_by(NoticiaFuente.publicado_en.desc().nulls_last(), NoticiaFuente.id.desc())
        .limit(por_pagina)
        .offset((pagina - 1) * por_pagina)
    ).all()
    return PaginaNoticias(
        total=total,
        pagina=pagina,
        por_pagina=por_pagina,
        noticias=[
            NoticiaOut(
                id=n.id,
                fuente=n.fuente.nombre,
                titulo=n.titulo,
                enlace=n.enlace,
                extracto=n.extracto,
                publicado_en=n.publicado_en,
                estado=n.estado,
                articulo_id=n.articulo_id,
            )
            for n in filas
        ],
    )


def _noticia(db: Session, noticia_id: int) -> NoticiaFuente:
    n = db.get(NoticiaFuente, noticia_id, options=[joinedload(NoticiaFuente.fuente)])
    if n is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Noticia no encontrada.")
    return n


def cambiar_estado(db: Session, noticia_id: int, estado: EstadoNoticia) -> None:
    _noticia(db, noticia_id).estado = estado
    db.commit()


def crear_borrador(db: Session, almacen: Almacen, quien: Usuario, noticia_id: int) -> BorradorCreado:
    n = _noticia(db, noticia_id)
    if n.articulo_id:
        return BorradorCreado(articulo_id=n.articulo_id)
    datos = ArticuloIn(
        titulo=n.titulo[:160],
        resumen=n.extracto[:400] or None,
        contenido=n.extracto,
        categoria_id=n.fuente.categoria_id,
        etiquetas=[],
        fuente_nombre=n.fuente.nombre,
        fuente_url=n.enlace,
    )
    creado = articulos.crear(db, almacen, quien, datos)
    n = _noticia(db, noticia_id)
    n.articulo_id, n.estado = creado.id, EstadoNoticia.USADA
    db.commit()
    return BorradorCreado(articulo_id=creado.id)


def procesar_lote(
    db: Session, almacen: Almacen, quien: Usuario, ids: list[int], accion: str
) -> ResultadoLote:
    for noticia_id in ids:
        if accion == "borrador":
            crear_borrador(db, almacen, quien, noticia_id)
        else:
            cambiar_estado(db, noticia_id, EstadoNoticia.DESCARTADA)
    return ResultadoLote(procesadas=len(ids))
