"""Categorías (dos niveles) y etiquetas: el panel las administra, el blog las muestra."""

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errores import ErrorNegocio
from app.core.slugs import slugificar
from app.models import Articulo, Categoria, Etiqueta, articulo_etiqueta
from app.schemas.contenido import CategoriaIn, CategoriaOut, EtiquetaIn, EtiquetaOut
from app.services.articulos import visible


def listar_categorias(db: Session) -> list[CategoriaOut]:
    """Padres primero, cada uno seguido de sus hijas; con cuántos artículos publicados tiene."""
    conteos = dict(
        db.execute(select(Articulo.categoria_id, func.count()).where(visible()).group_by(Articulo.categoria_id)).all()
    )
    todas = db.scalars(select(Categoria).order_by(Categoria.orden, Categoria.nombre)).all()

    def salida(c: Categoria) -> CategoriaOut:
        return CategoriaOut(
            id=c.id, nombre=c.nombre, slug=c.slug, descripcion=c.descripcion, padre_id=c.padre_id, orden=c.orden,
            articulos=conteos.get(c.id, 0),
        )  # fmt: skip

    ordenadas: list[CategoriaOut] = []
    for c in todas:
        if c.padre_id is None:
            ordenadas.append(salida(c))
            ordenadas.extend(salida(h) for h in todas if h.padre_id == c.id)
    return ordenadas


def _categoria(db: Session, categoria_id: int) -> Categoria:
    c = db.get(Categoria, categoria_id)
    if c is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Categoría no encontrada.")
    return c


def _validar_padre(db: Session, c: Categoria | None, padre_id: int | None) -> None:
    if padre_id is None:
        return
    padre = _categoria(db, padre_id)
    if c is not None and padre.id == c.id:
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, "Una categoría no puede ir dentro de sí misma.")
    if padre.padre_id is not None:
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, f"«{padre.nombre}» ya es una subcategoría: solo hay dos niveles.")
    if c is not None and db.scalar(select(Categoria.id).where(Categoria.padre_id == c.id).limit(1)):
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, "Esta categoría tiene subcategorías: no puede ir dentro de otra.")


def _guardar_categoria(db: Session, c: Categoria, datos: CategoriaIn) -> CategoriaOut:
    repetida = db.scalar(
        select(Categoria.id).where(func.lower(Categoria.nombre) == datos.nombre.lower(), Categoria.id != (c.id or 0))
    )
    if repetida:
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Ya existe una categoría con ese nombre.")
    c.nombre, c.descripcion, c.padre_id, c.orden = datos.nombre, datos.descripcion or None, datos.padre_id, datos.orden
    db.commit()
    return next(x for x in listar_categorias(db) if x.id == c.id)


def crear_categoria(db: Session, datos: CategoriaIn) -> CategoriaOut:
    _validar_padre(db, None, datos.padre_id)
    base = slugificar(datos.nombre, 60)
    slug, n = base, 1
    while db.scalar(select(Categoria.id).where(Categoria.slug == slug)):
        n += 1
        slug = f"{base}-{n}"
    c = Categoria(slug=slug, nombre=datos.nombre, orden=datos.orden)
    db.add(c)
    db.flush()
    return _guardar_categoria(db, c, datos)


def editar_categoria(db: Session, categoria_id: int, datos: CategoriaIn) -> CategoriaOut:
    """El slug no cambia al renombrar: no se rompen enlaces ni posiciones en Google."""
    c = _categoria(db, categoria_id)
    if datos.padre_id != c.padre_id:
        _validar_padre(db, c, datos.padre_id)
    return _guardar_categoria(db, c, datos)


def eliminar_categoria(db: Session, categoria_id: int) -> None:
    c = _categoria(db, categoria_id)
    if db.scalar(select(Categoria.id).where(Categoria.padre_id == c.id).limit(1)):
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Tiene subcategorías: elimínalas o muévelas primero.")
    if n := db.scalar(select(func.count()).select_from(Articulo).where(Articulo.categoria_id == c.id)):
        raise ErrorNegocio(status.HTTP_409_CONFLICT, f"Tiene {n} artículo(s). Muévelos a otra categoría antes de eliminarla.")
    db.delete(c)
    db.commit()


# ---------- Etiquetas ----------


def listar_etiquetas(db: Session) -> list[EtiquetaOut]:
    """Con cuántos artículos publicados tiene cada una; las más usadas primero."""
    publicados = (
        select(articulo_etiqueta.c.etiqueta_id, func.count().label("n"))
        .join(Articulo, Articulo.id == articulo_etiqueta.c.articulo_id)
        .where(visible())
        .group_by(articulo_etiqueta.c.etiqueta_id)
        .subquery()
    )
    filas = db.execute(
        select(Etiqueta, func.coalesce(publicados.c.n, 0))
        .outerjoin(publicados, publicados.c.etiqueta_id == Etiqueta.id)
        .order_by(func.coalesce(publicados.c.n, 0).desc(), Etiqueta.nombre)
    ).all()
    return [EtiquetaOut(id=e.id, nombre=e.nombre, slug=e.slug, articulos=n) for e, n in filas]


def renombrar_etiqueta(db: Session, etiqueta_id: int, datos: EtiquetaIn) -> EtiquetaOut:
    e = db.get(Etiqueta, etiqueta_id)
    if e is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Etiqueta no encontrada.")
    if db.scalar(select(Etiqueta.id).where(func.lower(Etiqueta.nombre) == datos.nombre.lower(), Etiqueta.id != e.id)):
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Ya existe una etiqueta con ese nombre.")
    e.nombre = datos.nombre
    db.commit()
    return next(x for x in listar_etiquetas(db) if x.id == e.id)


def eliminar_etiqueta(db: Session, etiqueta_id: int) -> None:
    """Se quita de los artículos que la tenían; los artículos no se tocan."""
    e = db.get(Etiqueta, etiqueta_id)
    if e is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Etiqueta no encontrada.")
    db.delete(e)
    db.commit()
