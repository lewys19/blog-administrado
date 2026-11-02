"""IA: lo que pide el editor y el borrador que recibe."""

from typing import Annotated

from pydantic import BaseModel, Field

from app.schemas.contenido import Texto


class BorradorIn(BaseModel):
    tema: Annotated[Texto, Field(min_length=5, max_length=300)]
    indicaciones: Annotated[Texto, Field(max_length=2000)] | None = None
    palabras: Annotated[int, Field(ge=300, le=3000)] = 1000


class BorradorOut(BaseModel):
    titulo: str
    resumen: str
    contenido: str
    etiquetas: list[str]
