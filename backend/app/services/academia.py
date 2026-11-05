"""Academia Digital: categorías y cursos. El panel los administra, la web muestra los publicados."""

import uuid

from fastapi import status
from sqlalchemy import ColumnElement, String, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.almacen import Almacen
from app.core.errores import ErrorNegocio
from app.core.slugs import slugificar
from app.models import AnuncioAcademia, CategoriaAcademia, Curso, EtiquetaAcademia, TipoRecurso
from app.schemas.academia import (
    AnuncioIn,
    AnuncioOut,
    CategoriaAcademiaIn,
    CategoriaAcademiaOut,
    CategoriaCorta,
    CursoIn,
    CursoPanel,
    CursoPublico,
    CursoTarjeta,
    EtiquetaAcademiaIn,
    EtiquetaAcademiaOut,
    Lateral,
    PaginaCursos,
)
from app.services import imagenes

MEDIDA_PORTADA = (1200, 630)
MEDIDA_ANUNCIO = (600, 500)
MAX_ANUNCIOS = 2  # los que caben en la columna
CON_TILDE, SIN_TILDE = "áéíóúü", "aeiouu"


# ---------- Categorías ----------


def listar_categorias(db: Session) -> list[CategoriaAcademiaOut]:
    conteos = dict(
        db.execute(select(Curso.categoria_id, func.count()).where(Curso.publicado).group_by(Curso.categoria_id)).all()
    )
    todas = db.scalars(select(CategoriaAcademia).order_by(CategoriaAcademia.orden, CategoriaAcademia.nombre)).all()
    return [
        CategoriaAcademiaOut(
            id=c.id, nombre=c.nombre, slug=c.slug, descripcion=c.descripcion, orden=c.orden, cursos=conteos.get(c.id, 0)
        )
        for c in todas
    ]


def _categoria(db: Session, categoria_id: int) -> CategoriaAcademia:
    c = db.get(CategoriaAcademia, categoria_id)
    if c is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Categoría no encontrada.")
    return c


def _slug_libre(db: Session, modelo: type[CategoriaAcademia] | type[Curso], texto: str, largo: int) -> str:
    base = slugificar(texto, largo)
    slug, n = base, 1
    while db.scalar(select(modelo.id).where(modelo.slug == slug)):
        n += 1
        slug = f"{base}-{n}"
    return slug


def _guardar_categoria(db: Session, c: CategoriaAcademia, datos: CategoriaAcademiaIn) -> CategoriaAcademiaOut:
    repetida = db.scalar(
        select(CategoriaAcademia.id).where(
            func.lower(CategoriaAcademia.nombre) == datos.nombre.lower(), CategoriaAcademia.id != (c.id or 0)
        )
    )
    if repetida:
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Ya existe una categoría con ese nombre.")
    c.nombre, c.descripcion, c.orden = datos.nombre, datos.descripcion or None, datos.orden
    db.add(c)
    db.commit()
    return next(x for x in listar_categorias(db) if x.id == c.id)


def crear_categoria(db: Session, datos: CategoriaAcademiaIn) -> CategoriaAcademiaOut:
    return _guardar_categoria(db, CategoriaAcademia(slug=_slug_libre(db, CategoriaAcademia, datos.nombre, 60)), datos)


def editar_categoria(db: Session, categoria_id: int, datos: CategoriaAcademiaIn) -> CategoriaAcademiaOut:
    return _guardar_categoria(db, _categoria(db, categoria_id), datos)


def eliminar_categoria(db: Session, categoria_id: int) -> None:
    c = _categoria(db, categoria_id)
    cursos = db.scalar(select(func.count()).select_from(Curso).where(Curso.categoria_id == c.id)) or 0
    if cursos:
        texto = "1 curso" if cursos == 1 else f"{cursos} cursos"
        raise ErrorNegocio(status.HTTP_409_CONFLICT, f"«{c.nombre}» tiene {texto}: muévelos antes de eliminarla.")
    db.delete(c)
    db.commit()


# ---------- Cursos ----------


def _tarjeta(c: Curso, almacen: Almacen) -> dict:
    return {
        "tipo": c.tipo,
        "slug": c.slug,
        "titulo": c.titulo,
        "descripcion": c.descripcion,
        "nivel": c.nivel,
        "horas": c.horas,
        "precio_anterior": c.precio_anterior,
        "precio": c.precio,
        "enlace": c.enlace if c.precio == 0 else None,  # el de un curso de pago no sale nunca al público
        "portada": almacen.url(c.portada_clave) if c.portada_clave else None,
        "categoria": CategoriaCorta(nombre=c.categoria.nombre, slug=c.categoria.slug),
    }


def _temario(c: Curso) -> list[str]:
    return [linea.strip() for linea in c.temario.splitlines() if linea.strip()]


def _detalle(c: Curso) -> dict:
    return {
        "temario": _temario(c),
        "tecnologias": [t.strip() for t in c.tecnologias.split(",") if t.strip()],
        "instalacion": c.instalacion,
    }


def _panel(c: Curso, almacen: Almacen) -> CursoPanel:
    return CursoPanel(
        **(_tarjeta(c, almacen) | {"enlace": c.enlace}),
        **_detalle(c),
        id=c.id,
        categoria_id=c.categoria_id,
        destacado=c.destacado,
        publicado=c.publicado,
    )


def _sin_tildes(columna: ColumnElement[str]) -> ColumnElement[str]:
    """«Introducción» se encuentra escribiendo «introduccion»."""
    return func.translate(func.lower(columna), CON_TILDE, SIN_TILDE, type_=String)


def listar_publicos(
    db: Session,
    almacen: Almacen,
    categoria: str | None = None,
    destacados: bool = False,
    q: str | None = None,
    tipo: TipoRecurso | None = None,
    pagina: int = 1,
    por_pagina: int = 12,
) -> PaginaCursos:
    filtros: list[ColumnElement[bool]] = [Curso.publicado]
    if categoria:
        filtros.append(Curso.categoria.has(CategoriaAcademia.slug == categoria))
    if destacados:
        filtros.append(Curso.destacado)
    if tipo:
        filtros.append(Curso.tipo == tipo)
    if q and q.strip():
        termino = q.strip().lower().translate(str.maketrans(CON_TILDE, SIN_TILDE))
        filtros.append(
            or_(*(_sin_tildes(c).contains(termino, autoescape=True) for c in (Curso.titulo, Curso.descripcion, Curso.temario)))
        )
    total = db.scalar(select(func.count()).select_from(Curso).where(*filtros)) or 0
    cursos = db.scalars(
        select(Curso)
        .options(joinedload(Curso.categoria))
        .where(*filtros)
        .order_by(Curso.destacado.desc(), Curso.creado_en.desc(), Curso.id.desc())
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
    ).all()
    return PaginaCursos(
        total=total, pagina=pagina, por_pagina=por_pagina, cursos=[CursoTarjeta(**_tarjeta(c, almacen)) for c in cursos]
    )


def ver_publico(db: Session, almacen: Almacen, slug: str) -> CursoPublico:
    c = db.scalar(select(Curso).options(joinedload(Curso.categoria)).where(Curso.slug == slug, Curso.publicado))
    if c is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Curso no encontrado.")
    return CursoPublico(**_tarjeta(c, almacen), **_detalle(c))


def listar_panel(db: Session, almacen: Almacen, tipo: TipoRecurso | None = None) -> list[CursoPanel]:
    consulta = select(Curso).options(joinedload(Curso.categoria)).order_by(Curso.creado_en.desc())
    cursos = db.scalars(consulta.where(Curso.tipo == tipo) if tipo else consulta).all()
    return [_panel(c, almacen) for c in cursos]


def _curso(db: Session, curso_id: int) -> Curso:
    c = db.get(Curso, curso_id)
    if c is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Curso no encontrado.")
    return c


def _guardar_curso(db: Session, almacen: Almacen, c: Curso, datos: CursoIn) -> CursoPanel:
    _categoria(db, datos.categoria_id)
    for campo, valor in datos.model_dump().items():
        setattr(c, campo, valor)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _panel(c, almacen)


def crear_curso(db: Session, almacen: Almacen, datos: CursoIn) -> CursoPanel:
    return _guardar_curso(db, almacen, Curso(slug=_slug_libre(db, Curso, datos.titulo, 120)), datos)


def editar_curso(db: Session, almacen: Almacen, curso_id: int, datos: CursoIn) -> CursoPanel:
    return _guardar_curso(db, almacen, _curso(db, curso_id), datos)


def cambiar_portada(db: Session, almacen: Almacen, curso_id: int, datos: bytes | None) -> CursoPanel:
    """Portada recortada a 1200×630 (o None para quitarla)."""
    c = _curso(db, curso_id)
    anterior, nueva = c.portada_clave, None
    if datos is not None:
        webp, _, _ = imagenes.procesar(datos, MEDIDA_PORTADA)
        nueva = f"cursos/{c.id}/portada-{uuid.uuid4().hex}.webp"
        almacen.guardar(nueva, webp, "image/webp")
    c.portada_clave = nueva
    try:
        db.commit()
    except Exception:
        if nueva:
            almacen.borrar(nueva)
        raise
    if anterior:
        almacen.borrar(anterior)
    return _panel(c, almacen)


def eliminar_curso(db: Session, almacen: Almacen, curso_id: int) -> None:
    c = _curso(db, curso_id)
    portada = c.portada_clave
    db.delete(c)
    db.commit()
    if portada:
        almacen.borrar(portada)


# ---------- Columna derecha: etiquetas y anuncios ----------


def _etiqueta_out(e: EtiquetaAcademia) -> EtiquetaAcademiaOut:
    return EtiquetaAcademiaOut(id=e.id, nombre=e.nombre, grupo=e.grupo, orden=e.orden)


def listar_etiquetas(db: Session) -> list[EtiquetaAcademiaOut]:
    consulta = select(EtiquetaAcademia).order_by(EtiquetaAcademia.grupo, EtiquetaAcademia.orden, EtiquetaAcademia.nombre)
    return [_etiqueta_out(e) for e in db.scalars(consulta)]


def _etiqueta(db: Session, etiqueta_id: int) -> EtiquetaAcademia:
    e = db.get(EtiquetaAcademia, etiqueta_id)
    if e is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Etiqueta no encontrada.")
    return e


def guardar_etiqueta(db: Session, datos: EtiquetaAcademiaIn, etiqueta_id: int | None = None) -> EtiquetaAcademiaOut:
    e = _etiqueta(db, etiqueta_id) if etiqueta_id else EtiquetaAcademia()
    repetida = db.scalar(
        select(EtiquetaAcademia.id).where(
            func.lower(EtiquetaAcademia.nombre) == datos.nombre.lower(),
            EtiquetaAcademia.grupo == datos.grupo,
            EtiquetaAcademia.id != (etiqueta_id or 0),
        )
    )
    if repetida:
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Ese grupo ya tiene esa etiqueta.")
    e.nombre, e.grupo, e.orden = datos.nombre, datos.grupo, datos.orden
    db.add(e)
    db.commit()
    return _etiqueta_out(e)


def eliminar_etiqueta(db: Session, etiqueta_id: int) -> None:
    db.delete(_etiqueta(db, etiqueta_id))
    db.commit()


def _anuncio_out(a: AnuncioAcademia, almacen: Almacen) -> AnuncioOut:
    return AnuncioOut(
        id=a.id,
        titulo=a.titulo,
        enlace=a.enlace,
        activo=a.activo,
        imagen=almacen.url(a.imagen_clave) if a.imagen_clave else None,
    )


def listar_anuncios(db: Session, almacen: Almacen) -> list[AnuncioOut]:
    consulta = select(AnuncioAcademia).order_by(AnuncioAcademia.creado_en.desc(), AnuncioAcademia.id.desc())
    return [_anuncio_out(a, almacen) for a in db.scalars(consulta)]


def _anuncio(db: Session, anuncio_id: int) -> AnuncioAcademia:
    a = db.get(AnuncioAcademia, anuncio_id)
    if a is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Anuncio no encontrado.")
    return a


def guardar_anuncio(db: Session, almacen: Almacen, datos: AnuncioIn, anuncio_id: int | None = None) -> AnuncioOut:
    a = _anuncio(db, anuncio_id) if anuncio_id else AnuncioAcademia()
    a.titulo, a.enlace, a.activo = datos.titulo, datos.enlace, datos.activo
    db.add(a)
    db.commit()
    return _anuncio_out(a, almacen)


def cambiar_imagen_anuncio(db: Session, almacen: Almacen, anuncio_id: int, datos: bytes) -> AnuncioOut:
    a = _anuncio(db, anuncio_id)
    anterior = a.imagen_clave
    webp, _, _ = imagenes.procesar(datos, MEDIDA_ANUNCIO)
    nueva = f"anuncios/{a.id}/{uuid.uuid4().hex}.webp"
    almacen.guardar(nueva, webp, "image/webp")
    a.imagen_clave = nueva
    try:
        db.commit()
    except Exception:
        almacen.borrar(nueva)
        raise
    if anterior:
        almacen.borrar(anterior)
    return _anuncio_out(a, almacen)


def eliminar_anuncio(db: Session, almacen: Almacen, anuncio_id: int) -> None:
    a = _anuncio(db, anuncio_id)
    imagen = a.imagen_clave
    db.delete(a)
    db.commit()
    if imagen:
        almacen.borrar(imagen)


def lateral(db: Session, almacen: Almacen) -> Lateral:
    activos = db.scalars(
        select(AnuncioAcademia)
        .where(AnuncioAcademia.activo)
        .order_by(AnuncioAcademia.creado_en.desc(), AnuncioAcademia.id.desc())
        .limit(MAX_ANUNCIOS)
    ).all()
    propio = None
    if not activos:  # sin publicidad contratada, la columna promociona un curso de pago destacado
        propio = db.scalar(
            select(Curso)
            .options(joinedload(Curso.categoria))
            .where(Curso.publicado, Curso.destacado, Curso.precio > 0, Curso.tipo == TipoRecurso.CURSO)
            .order_by(Curso.creado_en.desc(), Curso.id.desc())
            .limit(1)
        )
    return Lateral(
        etiquetas=listar_etiquetas(db),
        anuncios=[_anuncio_out(a, almacen) for a in activos],
        curso=CursoTarjeta(**_tarjeta(propio, almacen)) if propio else None,
    )
