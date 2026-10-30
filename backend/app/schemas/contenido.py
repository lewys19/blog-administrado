from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_validator

from app.core.slugs import slugificar
from app.models import EstadoArticulo

Texto = Annotated[str, StringConstraints(strip_whitespace=True)]


# ---------- Categorías y etiquetas ----------


class CategoriaOut(BaseModel):
    id: int
    nombre: str
    slug: str
    descripcion: str | None
    padre_id: int | None
    orden: int
    articulos: int  # publicados


class CategoriaIn(BaseModel):
    nombre: Annotated[Texto, Field(min_length=2, max_length=60)]
    descripcion: Annotated[Texto, Field(max_length=300)] | None = None
    padre_id: int | None = None
    orden: Annotated[int, Field(ge=0, le=999)] = 0


class EtiquetaOut(BaseModel):
    id: int
    nombre: str
    slug: str
    articulos: int


class EtiquetaIn(BaseModel):
    nombre: Annotated[Texto, Field(min_length=2, max_length=40)]


# ---------- Artículos en el panel ----------


class Corto(BaseModel):
    nombre: str
    slug: str


class AutorCorto(BaseModel):
    id: int
    nombre: str
    username: str


class ArticuloFila(BaseModel):
    """Una fila de la tabla de artículos del panel."""

    id: int
    titulo: str
    slug: str
    estado: EstadoArticulo
    destacado: bool
    categoria: Corto | None
    autor: AutorCorto
    publicado_en: datetime | None
    actualizado_en: datetime
    seo_completo: bool  # tiene meta descripción y resumen


class PaginaArticulosPanel(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    articulos: list[ArticuloFila]


class ArticuloEditor(ArticuloFila):
    """Todo lo que necesita el editor."""

    resumen: str | None
    contenido: str
    imagen: str | None
    categoria_id: int | None
    etiquetas: list[str]
    minutos_lectura: int
    meta_titulo: str | None
    meta_descripcion: str | None
    palabras_clave: str | None


class ArticuloIn(BaseModel):
    titulo: Annotated[Texto, Field(min_length=3, max_length=160)]
    slug: Annotated[Texto, Field(max_length=180)] | None = None  # vacío: se arma del título
    resumen: Annotated[Texto, Field(max_length=400)] | None = None
    contenido: Annotated[str, Field(max_length=200_000)] = ""
    categoria_id: int | None = None
    etiquetas: Annotated[list[Annotated[Texto, Field(min_length=2, max_length=40)]], Field(max_length=10)] = []
    estado: EstadoArticulo = EstadoArticulo.BORRADOR
    publicado_en: datetime | None = None  # obligatoria para «programado»
    destacado: bool = False
    meta_titulo: Annotated[Texto, Field(max_length=70)] | None = None
    meta_descripcion: Annotated[Texto, Field(max_length=170)] | None = None
    palabras_clave: Annotated[Texto, Field(max_length=200)] | None = None

    @field_validator("slug")
    @classmethod
    def _slug(cls, valor: str | None) -> str | None:
        return slugificar(valor, 180) if valor else None


class VistaPreviaIn(BaseModel):
    contenido: Annotated[str, Field(max_length=200_000)]


class VistaPreviaOut(BaseModel):
    html: str
    minutos_lectura: int


# ---------- Blog público ----------


class AutorPublico(BaseModel):
    nombre: str
    username: str


class ArticuloTarjeta(BaseModel):
    titulo: str
    slug: str
    resumen: str | None
    imagen: str | None
    categoria: Corto | None
    autor: AutorPublico
    publicado_en: datetime
    minutos_lectura: int
    destacado: bool


class PaginaArticulos(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    articulos: list[ArticuloTarjeta]


class AutorFicha(BaseModel):
    """La caja "Sobre el autor" al lado del artículo."""

    nombre: str
    username: str
    biografia: str | None
    articulos: int  # publicados


class MasLeido(BaseModel):
    titulo: str
    slug: str
    imagen: str | None
    vistas: int  # en los últimos 30 días


class ArticuloPublico(ArticuloTarjeta):
    vistas: int  # todas las visitas que tuvo
    comentarios: int  # aprobados
    sobre_autor: AutorFicha
    contenido_html: str
    etiquetas: list[Corto]
    actualizado_en: datetime
    meta_titulo: str  # ya resuelto: el propio o el título
    meta_descripcion: str  # el propio, el resumen o el inicio del texto
    palabras_clave: str | None
    relacionados: list[ArticuloTarjeta]


class AutorConArticulos(BaseModel):
    nombre: str
    username: str
    biografia: str | None
    articulos: list[ArticuloTarjeta]
