from decimal import Decimal
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.models.academia import GrupoEtiqueta, NivelCurso, TipoRecurso

Texto = Annotated[str, StringConstraints(strip_whitespace=True)]
Precio = Annotated[Decimal, Field(ge=0, max_digits=8, decimal_places=2)]


def _validar_https(enlace: str) -> None:
    partes = urlsplit(enlace)
    if partes.scheme != "https" or not partes.netloc:
        raise ValueError("El enlace debe empezar con https://")


class CategoriaAcademiaIn(BaseModel):
    nombre: Annotated[Texto, Field(min_length=2, max_length=60)]
    descripcion: Annotated[Texto, Field(max_length=300)] | None = None
    orden: Annotated[int, Field(ge=0, le=999)] = 0


class CategoriaAcademiaOut(BaseModel):
    id: int
    nombre: str
    slug: str
    descripcion: str | None
    orden: int
    cursos: int  # publicados


class CategoriaCorta(BaseModel):
    nombre: str
    slug: str


class CursoIn(BaseModel):
    tipo: TipoRecurso = TipoRecurso.CURSO
    categoria_id: int
    titulo: Annotated[Texto, Field(min_length=3, max_length=120)]
    descripcion: Annotated[Texto, Field(min_length=10, max_length=2000)]
    temario: Annotated[Texto, Field(max_length=5000)] = ""
    tecnologias: Annotated[Texto, Field(max_length=300)] = ""
    instalacion: Annotated[Texto, Field(max_length=10000)] = ""
    nivel: NivelCurso
    horas: Annotated[int, Field(ge=1, le=999)] | None = None
    precio_anterior: Precio | None = None
    precio: Precio
    enlace: Annotated[Texto, Field(max_length=500)] | None = None
    destacado: bool = False
    publicado: bool = False

    @model_validator(mode="after")
    def _oferta(self) -> "CursoIn":
        if self.precio_anterior is not None and self.precio_anterior <= self.precio:
            raise ValueError("El precio anterior debe ser mayor que el precio actual.")
        self.enlace = self.enlace or None
        if self.enlace:
            _validar_https(self.enlace)
        elif self.precio == 0:
            raise ValueError("Un curso gratis necesita el enlace a su material.")
        return self


class CursoTarjeta(BaseModel):
    tipo: TipoRecurso
    slug: str
    titulo: str
    descripcion: str
    nivel: NivelCurso
    horas: int | None
    precio_anterior: float | None
    precio: float
    enlace: str | None  # en lo público, solo el de los cursos gratis
    portada: str | None
    categoria: CategoriaCorta


class CursoPublico(CursoTarjeta):
    temario: list[str]
    tecnologias: list[str]
    instalacion: str


class CursoPanel(CursoPublico):
    id: int
    categoria_id: int
    destacado: bool
    publicado: bool


class PaginaCursos(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    cursos: list[CursoTarjeta]


class EtiquetaAcademiaIn(BaseModel):
    nombre: Annotated[Texto, Field(min_length=1, max_length=40)]
    grupo: GrupoEtiqueta
    orden: Annotated[int, Field(ge=0, le=999)] = 0


class EtiquetaAcademiaOut(EtiquetaAcademiaIn):
    id: int


class AnuncioIn(BaseModel):
    titulo: Annotated[Texto, Field(min_length=2, max_length=80)]
    enlace: Annotated[Texto, Field(max_length=500)]
    activo: bool = True

    @model_validator(mode="after")
    def _enlace(self) -> "AnuncioIn":
        _validar_https(self.enlace)
        return self


class AnuncioOut(AnuncioIn):
    id: int
    imagen: str | None


class Lateral(BaseModel):
    """La columna derecha: etiquetas, anuncios activos y, si no hay anuncios, un curso propio."""

    etiquetas: list[EtiquetaAcademiaOut]
    anuncios: list[AnuncioOut]
    curso: CursoTarjeta | None
