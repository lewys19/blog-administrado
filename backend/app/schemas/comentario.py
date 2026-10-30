from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, StringConstraints

from app.schemas.contenido import Corto

Estado = Literal["pendiente", "aprobado", "spam"]
Texto = Annotated[str, StringConstraints(strip_whitespace=True)]


class ComentarioIn(BaseModel):
    nombre: Annotated[Texto, Field(min_length=2, max_length=60)]
    correo: EmailStr
    contenido: Annotated[Texto, Field(min_length=3, max_length=2000)]
    # Trampa para robots: el campo está oculto, una persona lo deja vacío.
    sitio_web: str | None = None


class ComentarioEnviado(BaseModel):
    estado: Estado
    mensaje: str


class ComentarioPublico(BaseModel):
    id: int
    nombre: str
    contenido: str  # texto plano: la web lo muestra tal cual, sin HTML
    creado_en: datetime


class ComentarioPanel(ComentarioPublico):
    correo: str
    estado: Estado
    articulo: Corto  # título y slug


class ConteoComentarios(BaseModel):
    pendiente: int
    aprobado: int
    spam: int


class PaginaComentarios(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    conteo: ConteoComentarios
    comentarios: list[ComentarioPanel]


class ModerarIn(BaseModel):
    estado: Estado
