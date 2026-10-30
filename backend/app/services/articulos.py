"""Artículos: escribir y publicar desde el panel (según el rol) y leerlos en el blog.

Reglas del flujo editorial:
- `articulos.escribir`: crea y edita SUS artículos mientras son borrador o están en revisión.
- `articulos.publicar`: publica, programa, despublica y marca destacados.
- `articulos.editar_todos`: edita los de cualquier autor.
Un artículo «programado» se ve en el blog desde su fecha, sin ningún proceso aparte.
"""

import re
import uuid
from datetime import datetime, timedelta

from fastapi import status
from sqlalchemy import ColumnElement, Select, and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.almacen import Almacen
from app.core.errores import ErrorNegocio
from app.core.fechas import ahora
from app.core.slugs import slugificar
from app.models import (
    Articulo,
    Categoria,
    EstadoArticulo,
    Etiqueta,
    Usuario,
    Visita,
    articulo_etiqueta,
)
from app.schemas.contenido import (
    ArticuloEditor,
    ArticuloFila,
    ArticuloIn,
    ArticuloPublico,
    ArticuloTarjeta,
    AutorConArticulos,
    AutorCorto,
    AutorFicha,
    AutorPublico,
    Corto,
    MasLeido,
    PaginaArticulos,
    PaginaArticulosPanel,
)
from app.services import imagenes, markdown

# Portada 1200×630: la medida que usan Facebook, LinkedIn y X al compartir.
MEDIDA_PORTADA = (1200, 630)


def visible() -> ColumnElement[bool]:
    """Lo que ve el público: publicado, o programado cuya fecha ya llegó."""
    return or_(
        Articulo.estado == EstadoArticulo.PUBLICADO,
        and_(Articulo.estado == EstadoArticulo.PROGRAMADO, Articulo.publicado_en <= func.now()),
    )


def _con_relaciones(consulta: Select) -> Select:
    return consulta.options(
        selectinload(Articulo.categoria), selectinload(Articulo.autor), selectinload(Articulo.etiquetas)
    )


# ---------- Salidas ----------


def _corto(c: Categoria | Etiqueta | None) -> Corto | None:
    return Corto(nombre=c.nombre, slug=c.slug) if c else None


def _fila(a: Articulo) -> ArticuloFila:
    return ArticuloFila(
        id=a.id, titulo=a.titulo, slug=a.slug, estado=a.estado, destacado=a.destacado,
        categoria=_corto(a.categoria), autor=AutorCorto(id=a.autor.id, nombre=a.autor.nombre, username=a.autor.username),
        publicado_en=a.publicado_en, actualizado_en=a.actualizado_en,
        seo_completo=bool(a.meta_descripcion and a.resumen),
    )  # fmt: skip


def _editor(a: Articulo, almacen: Almacen) -> ArticuloEditor:
    return ArticuloEditor(
        **_fila(a).model_dump(),
        resumen=a.resumen, contenido=a.contenido, imagen=almacen.url(a.imagen_clave) if a.imagen_clave else None,
        categoria_id=a.categoria_id, etiquetas=[e.nombre for e in a.etiquetas], minutos_lectura=a.minutos_lectura,
        meta_titulo=a.meta_titulo, meta_descripcion=a.meta_descripcion, palabras_clave=a.palabras_clave,
    )  # fmt: skip


def _tarjeta(a: Articulo, almacen: Almacen) -> ArticuloTarjeta:
    assert a.publicado_en is not None
    return ArticuloTarjeta(
        titulo=a.titulo, slug=a.slug, resumen=a.resumen,
        imagen=almacen.url(a.imagen_clave) if a.imagen_clave else None,
        categoria=_corto(a.categoria), autor=AutorPublico(nombre=a.autor.nombre, username=a.autor.username),
        publicado_en=a.publicado_en, minutos_lectura=a.minutos_lectura, destacado=a.destacado,
    )  # fmt: skip


def _descripcion(a: Articulo) -> str:
    """Meta descripción: la escrita, el resumen o las primeras ~160 letras del texto."""
    if a.meta_descripcion:
        return a.meta_descripcion
    if a.resumen:
        return a.resumen[:170]
    plano = re.sub(r"<[^>]+>", " ", a.contenido_html)
    plano = re.sub(r"\s+", " ", plano).strip()
    return plano[:157] + "…" if len(plano) > 160 else plano


# ---------- Panel ----------


def _puede_editar(quien: Usuario, a: Articulo) -> bool:
    if quien.puede("articulos.editar_todos"):
        return True
    if a.autor_id != quien.id or not quien.puede("articulos.escribir"):
        return False
    # Ya publicado (o programado), solo lo toca quien puede publicar.
    return a.estado in (EstadoArticulo.BORRADOR, EstadoArticulo.REVISION) or quien.puede("articulos.publicar")


def _cargar(db: Session, articulo_id: int) -> Articulo:
    a = db.scalar(_con_relaciones(select(Articulo).where(Articulo.id == articulo_id)))
    if a is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Artículo no encontrado.")
    return a


def _editable(db: Session, quien: Usuario, articulo_id: int) -> Articulo:
    a = _cargar(db, articulo_id)
    if not _puede_editar(quien, a):
        raise ErrorNegocio(status.HTTP_403_FORBIDDEN, "No puedes editar este artículo.")
    return a


def listar_panel(
    db: Session, quien: Usuario, q: str | None, estado: EstadoArticulo | None, pagina: int, por_pagina: int
) -> PaginaArticulosPanel:
    """Quien no puede editar los de otros ve solo los suyos."""
    consulta = select(Articulo)
    if not quien.puede("articulos.editar_todos"):
        consulta = consulta.where(Articulo.autor_id == quien.id)
    if estado:
        consulta = consulta.where(Articulo.estado == estado)
    if q and q.strip():
        consulta = consulta.where(Articulo.titulo.ilike(f"%{q.strip()}%"))
    total = db.scalar(select(func.count()).select_from(consulta.subquery())) or 0
    articulos = db.scalars(
        _con_relaciones(consulta)
        .order_by(Articulo.actualizado_en.desc(), Articulo.id.desc())
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
    ).all()
    return PaginaArticulosPanel(total=total, pagina=pagina, por_pagina=por_pagina, articulos=[_fila(a) for a in articulos])


def ver_panel(db: Session, almacen: Almacen, quien: Usuario, articulo_id: int) -> ArticuloEditor:
    return _editor(_editable(db, quien, articulo_id), almacen)


def _slug_libre(db: Session, deseado: str, propio_id: int | None) -> str:
    base, slug, n = deseado, deseado, 1
    while db.scalar(select(Articulo.id).where(Articulo.slug == slug, Articulo.id != (propio_id or 0))) is not None:
        n += 1
        slug = f"{base[:170]}-{n}"
    return slug


def _etiquetas(db: Session, nombres: list[str]) -> list[Etiqueta]:
    """Las que existen se reutilizan (sin distinguir mayúsculas); las nuevas se crean."""
    salida: list[Etiqueta] = []
    # Una sola vez cada nombre, sin distinguir mayúsculas («Docker» y «docker» son la misma).
    unicos = {n.strip().lower(): n.strip() for n in reversed(nombres) if n.strip()}
    for nombre in reversed(list(unicos.values())):
        etiqueta = db.scalar(select(Etiqueta).where(func.lower(Etiqueta.nombre) == nombre.lower()))
        if etiqueta is None:
            slug = slugificar(nombre, 50)
            etiqueta = db.scalar(select(Etiqueta).where(Etiqueta.slug == slug)) or Etiqueta(nombre=nombre, slug=slug)
            db.add(etiqueta)
        if etiqueta not in salida:
            salida.append(etiqueta)
    return salida


def _validar_estado(quien: Usuario, a: Articulo, datos: ArticuloIn) -> None:
    publica = datos.estado in (EstadoArticulo.PUBLICADO, EstadoArticulo.PROGRAMADO)
    cambia_publicacion = publica or a.estado in (EstadoArticulo.PUBLICADO, EstadoArticulo.PROGRAMADO)
    if (cambia_publicacion or datos.destacado != a.destacado) and not quien.puede("articulos.publicar"):
        raise ErrorNegocio(
            status.HTTP_403_FORBIDDEN, "Tu rol no puede publicar: guárdalo como borrador o envíalo a revisión."
        )
    if datos.estado == EstadoArticulo.PROGRAMADO and (datos.publicado_en is None or datos.publicado_en <= ahora()):
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, "Para programarlo, elige una fecha y hora futuras.")


def _aplicar(db: Session, quien: Usuario, a: Articulo, datos: ArticuloIn) -> None:
    _validar_estado(quien, a, datos)
    if datos.categoria_id is not None and db.get(Categoria, datos.categoria_id) is None:
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, "La categoría no existe.")
    a.titulo = datos.titulo
    a.slug = _slug_libre(db, datos.slug or slugificar(datos.titulo, 170), a.id)
    a.resumen = datos.resumen or None
    a.contenido = datos.contenido
    a.contenido_html = markdown.a_html(datos.contenido)
    a.minutos_lectura = markdown.minutos_lectura(datos.contenido)
    a.categoria_id = datos.categoria_id
    a.etiquetas = _etiquetas(db, datos.etiquetas)
    a.meta_titulo = datos.meta_titulo or None
    a.meta_descripcion = datos.meta_descripcion or None
    a.palabras_clave = datos.palabras_clave or None
    a.destacado = datos.destacado
    if datos.estado == EstadoArticulo.PROGRAMADO:
        a.publicado_en = datos.publicado_en
    elif datos.estado == EstadoArticulo.PUBLICADO:
        # Al publicar se fija la fecha; si ya estaba publicado, se conserva.
        if a.estado != EstadoArticulo.PUBLICADO or a.publicado_en is None:
            a.publicado_en = ahora()
    else:
        a.publicado_en = None
    a.estado = datos.estado


def crear(db: Session, almacen: Almacen, quien: Usuario, datos: ArticuloIn) -> ArticuloEditor:
    a = Articulo(autor_id=quien.id, estado=EstadoArticulo.BORRADOR, destacado=False, contenido="", contenido_html="")
    db.add(a)
    _aplicar(db, quien, a, datos)
    db.commit()
    return _editor(_cargar(db, a.id), almacen)


def editar(db: Session, almacen: Almacen, quien: Usuario, articulo_id: int, datos: ArticuloIn) -> ArticuloEditor:
    a = _editable(db, quien, articulo_id)
    _aplicar(db, quien, a, datos)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Ya existe un artículo con esa URL.") from None
    db.expire_all()
    return _editor(_cargar(db, articulo_id), almacen)


def eliminar(db: Session, almacen: Almacen, quien: Usuario, articulo_id: int) -> None:
    a = _editable(db, quien, articulo_id)
    clave = a.imagen_clave
    db.delete(a)
    db.commit()
    if clave:
        almacen.borrar(clave)


def cambiar_imagen(
    db: Session, almacen: Almacen, quien: Usuario, articulo_id: int, datos: bytes | None
) -> ArticuloEditor:
    """Portada recortada a 1200×630 (o None para quitarla)."""
    a = _editable(db, quien, articulo_id)
    anterior, nueva = a.imagen_clave, None
    if datos is not None:
        webp, _, _ = imagenes.procesar(datos, MEDIDA_PORTADA)
        nueva = f"articulos/{a.id}/portada-{uuid.uuid4().hex}.webp"
        almacen.guardar(nueva, webp, "image/webp")
    a.imagen_clave = nueva
    try:
        db.commit()
    except Exception:
        if nueva:
            almacen.borrar(nueva)
        raise
    if anterior:
        almacen.borrar(anterior)
    return _editor(_cargar(db, articulo_id), almacen)


def contar_publicados(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Articulo).where(visible())) or 0


# ---------- Blog público ----------


def listar_publicos(
    db: Session,
    almacen: Almacen,
    pagina: int,
    por_pagina: int,
    categoria: str | None = None,
    etiqueta: str | None = None,
    autor: str | None = None,
    q: str | None = None,
) -> PaginaArticulos:
    """Lo más nuevo primero; con `q`, lo más relevante primero (búsqueda en español)."""
    consulta = select(Articulo).where(visible())
    if categoria:
        # Una categoría incluye las de su segundo nivel.
        padre = select(Categoria.id).where(Categoria.slug == categoria).scalar_subquery()
        ids = select(Categoria.id).where(or_(Categoria.slug == categoria, Categoria.padre_id == padre))
        consulta = consulta.where(Articulo.categoria_id.in_(ids))
    if etiqueta:
        consulta = consulta.where(
            Articulo.id.in_(
                select(articulo_etiqueta.c.articulo_id)
                .join(Etiqueta, Etiqueta.id == articulo_etiqueta.c.etiqueta_id)
                .where(Etiqueta.slug == etiqueta)
            )
        )
    if autor:
        consulta = consulta.join(Usuario, Usuario.id == Articulo.autor_id).where(Usuario.username == autor)
    orden = [Articulo.publicado_en.desc(), Articulo.id.desc()]
    if q and q.strip():
        consulta_ts = func.websearch_to_tsquery("spanish", q.strip())
        consulta = consulta.where(Articulo.busqueda.op("@@")(consulta_ts))
        orden = [func.ts_rank(Articulo.busqueda, consulta_ts).desc(), *orden]
    total = db.scalar(select(func.count()).select_from(consulta.subquery())) or 0
    articulos = db.scalars(
        _con_relaciones(consulta).order_by(*orden).offset((pagina - 1) * por_pagina).limit(por_pagina)
    ).all()
    return PaginaArticulos(
        total=total, pagina=pagina, por_pagina=por_pagina, articulos=[_tarjeta(a, almacen) for a in articulos]
    )


def _relacionados(db: Session, almacen: Almacen, a: Articulo, cuantos: int = 3) -> list[ArticuloTarjeta]:
    """Misma categoría o alguna etiqueta en común; los más nuevos. Si faltan, se completa con los más recientes."""
    etiquetas = [e.id for e in a.etiquetas]
    condicion = Articulo.categoria_id == a.categoria_id if a.categoria_id else None
    if etiquetas:
        en_comun = Articulo.id.in_(
            select(articulo_etiqueta.c.articulo_id).where(articulo_etiqueta.c.etiqueta_id.in_(etiquetas))
        )
        condicion = or_(condicion, en_comun) if condicion is not None else en_comun
    otros: list[Articulo] = []
    if condicion is not None:
        otros = list(
            db.scalars(
                _con_relaciones(select(Articulo).where(visible(), Articulo.id != a.id, condicion))
                .order_by(Articulo.publicado_en.desc())
                .limit(cuantos)
            ).all()
        )
    if len(otros) < cuantos:
        fuera = [a.id, *(o.id for o in otros)]
        otros += db.scalars(
            _con_relaciones(select(Articulo).where(visible(), Articulo.id.not_in(fuera)))
            .order_by(Articulo.publicado_en.desc())
            .limit(cuantos - len(otros))
        ).all()
    return [_tarjeta(o, almacen) for o in otros]


def ver_publico(db: Session, almacen: Almacen, slug: str) -> ArticuloPublico:
    a = db.scalar(_con_relaciones(select(Articulo).where(Articulo.slug == slug, visible())))
    if a is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Artículo no encontrado.")
    publicados_del_autor = db.scalar(
        select(func.count()).select_from(Articulo).where(Articulo.autor_id == a.autor_id, visible())
    )
    return ArticuloPublico(
        **_tarjeta(a, almacen).model_dump(),
        vistas=db.scalar(select(func.count()).select_from(Visita).where(Visita.articulo_id == a.id)) or 0,
        sobre_autor=AutorFicha(
            nombre=a.autor.nombre, username=a.autor.username, biografia=a.autor.biografia,
            articulos=publicados_del_autor or 0,
        ),  # fmt: skip
        contenido_html=a.contenido_html,
        etiquetas=[Corto(nombre=e.nombre, slug=e.slug) for e in a.etiquetas],
        actualizado_en=a.actualizado_en,
        meta_titulo=a.meta_titulo or a.titulo,
        meta_descripcion=_descripcion(a),
        palabras_clave=a.palabras_clave,
        relacionados=_relacionados(db, almacen, a),
    )


def autor_publico(db: Session, almacen: Almacen, username: str) -> AutorConArticulos:
    u = db.scalar(select(Usuario).where(Usuario.username == username, Usuario.eliminado_en.is_(None)))
    if u is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Autor no encontrado.")
    articulos = listar_publicos(db, almacen, 1, 50, autor=username).articulos
    if not articulos and not u.en_panel:
        # Un lector sin artículos no tiene página de autor.
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Autor no encontrado.")
    return AutorConArticulos(nombre=u.nombre, username=u.username, biografia=u.biografia, articulos=articulos)


def mapa_del_sitio(db: Session) -> list[tuple[str, datetime]]:
    """(slug, última modificación) de todo lo publicado: para sitemap.xml."""
    return [
        (slug, fecha)
        for slug, fecha in db.execute(
            select(Articulo.slug, Articulo.actualizado_en).where(visible()).order_by(Articulo.publicado_en.desc())
        ).all()
    ]


def mas_leidos(db: Session, almacen: Almacen, limite: int) -> list[MasLeido]:
    """Los más vistos de los últimos 30 días; si faltan (blog nuevo), se completa con los más recientes."""
    vistas = func.count(Visita.id)
    filas = db.execute(
        select(Articulo, vistas)
        .join(Visita, (Visita.articulo_id == Articulo.id) & (Visita.creado_en >= ahora() - timedelta(days=30)))
        .where(visible())
        .group_by(Articulo.id)
        .order_by(vistas.desc(), Articulo.publicado_en.desc())
        .limit(limite)
    ).all()
    lista = [(a, n) for a, n in filas]
    if len(lista) < limite:
        ya = [a.id for a, _ in lista]
        recientes = db.scalars(
            select(Articulo).where(visible(), Articulo.id.not_in(ya)).order_by(Articulo.publicado_en.desc())
            .limit(limite - len(lista))
        ).all()  # fmt: skip
        lista += [(a, 0) for a in recientes]
    return [
        MasLeido(titulo=a.titulo, slug=a.slug, imagen=almacen.url(a.imagen_clave) if a.imagen_clave else None, vistas=n)
        for a, n in lista
    ]
