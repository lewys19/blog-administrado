from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, StringConstraints, field_validator

from app.models.fuentes import EstadoNoticia

Texto = Annotated[str, StringConstraints(strip_whitespace=True)]


class FuenteIn(BaseModel):
    nombre: Annotated[Texto, Field(min_length=2, max_length=80)]
    url: Annotated[Texto, Field(max_length=500)]
    categoria_id: int | None = None
    activa: bool = True
    palabras: Annotated[Texto, Field(max_length=300)] = ""

    @field_validator("url")
    @classmethod
    def _https(cls, valor: str) -> str:
        partes = urlsplit(valor)
        if partes.scheme != "https" or not partes.hostname:
            raise ValueError("La dirección del RSS debe empezar con https://")
        return valor


class FuenteOut(FuenteIn):
    id: int
    leida_en: datetime | None
    ultimo_error: str | None
    nuevas: int = 0


class NoticiaOut(BaseModel):
    id: int
    fuente: str
    titulo: str
    enlace: str
    extracto: str
    publicado_en: datetime | None
    estado: EstadoNoticia
    articulo_id: int | None


class PaginaNoticias(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    noticias: list[NoticiaOut]


class ResultadoLectura(BaseModel):
    leidas: int
    con_error: int
    nuevas: int


class BorradorCreado(BaseModel):
    articulo_id: int


class AvisoFuentes(BaseModel):
    nuevas: int
    con_error: int


class LoteIn(BaseModel):
    ids: Annotated[list[int], Field(min_length=1, max_length=50)]
    accion: Literal["borrador", "descartar"]


class ResultadoLote(BaseModel):
    procesadas: int
