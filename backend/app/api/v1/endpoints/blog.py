"""Blog público: sin sesión. Solo lo publicado (o programado cuya fecha ya llegó)."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.almacen import Almacen, obtener_almacen
from app.api.deps import Db
from app.models import TipoArticulo
from app.schemas.contenido import (
    ArticuloPublico,
    AutorConArticulos,
    CategoriaOut,
    EtiquetaOut,
    MasLeido,
    PaginaArticulos,
)
from app.schemas.estadistica import Cuenta
from app.services import articulos, estadisticas, taxonomia

router = APIRouter(prefix="/blog", tags=["Blog"])
AlmacenDep = Annotated[Almacen, Depends(obtener_almacen)]
Slug = Annotated[str | None, Query(max_length=80)]


class EntradaMapa(BaseModel):
    slug: str
    tipo: str
    tema: str | None
    actualizado_en: datetime


@router.get("/articulos", response_model=PaginaArticulos)
def listar(
    db: Db,
    almacen: AlmacenDep,
    pagina: Annotated[int, Query(ge=1)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=50)] = 12,
    categoria: Slug = None,
    etiqueta: Slug = None,
    autor: Slug = None,
    q: Annotated[str | None, Query(max_length=100, description="Búsqueda en español")] = None,
    tipo: Annotated[TipoArticulo | None, Query(description="noticia (/blog) o guia (/guias)")] = None,
    tema: Slug = None,
    destacado: Annotated[bool, Query(description="Solo los marcados como destacados")] = False,
) -> PaginaArticulos:
    return articulos.listar_publicos(
        db, almacen, pagina, por_pagina, categoria, etiqueta, autor, q, tipo, tema, destacado
    )


@router.get("/articulos/{slug}", response_model=ArticuloPublico)
def ver(slug: str, db: Db, almacen: AlmacenDep) -> ArticuloPublico:
    return articulos.ver_publico(db, almacen, slug)


@router.get("/mas-leidos", response_model=list[MasLeido])
def mas_leidos(db: Db, almacen: AlmacenDep, limite: Annotated[int, Query(ge=1, le=10)] = 5) -> list[MasLeido]:
    """Para la barra lateral: los más vistos de los últimos 30 días."""
    return articulos.mas_leidos(db, almacen, limite)


@router.get("/paises/mapa", response_model=list[Cuenta])
def paises_mapa(db: Db) -> list[Cuenta]:
    """Solo conteos por país, para colorear el mapa."""
    return estadisticas.paises_mapa(db)


@router.get("/paises", response_model=list[Cuenta])
def paises(db: Db) -> list[Cuenta]:
    """Para la portada: los 5 países con más visitas en 30 días y el resto como «otros» (clave nula)."""
    return estadisticas.paises_publicos(db)


@router.get("/categorias", response_model=list[CategoriaOut])
def categorias(db: Db) -> list[CategoriaOut]:
    return taxonomia.listar_categorias(db)


@router.get("/etiquetas", response_model=list[EtiquetaOut])
def etiquetas(db: Db) -> list[EtiquetaOut]:
    return [e for e in taxonomia.listar_etiquetas(db) if e.articulos]


@router.get("/autores/{username}", response_model=AutorConArticulos)
def autor(username: str, db: Db, almacen: AlmacenDep) -> AutorConArticulos:
    return articulos.autor_publico(db, almacen, username)


@router.get("/mapa", response_model=list[EntradaMapa])
def mapa(db: Db) -> list[EntradaMapa]:
    """Todo lo publicado, para el sitemap.xml de la web."""
    return [EntradaMapa(slug=s, tipo=t, tema=m, actualizado_en=f) for s, t, m, f in articulos.mapa_del_sitio(db)]


@router.get("/temas-guia", response_model=list[CategoriaOut])
def temas_guia(db: Db) -> list[CategoriaOut]:
    """Temas de las guías (Python, Backend, Django, Otros), en su orden."""
    return articulos.temas_guia(db)
