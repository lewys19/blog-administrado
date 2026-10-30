from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr

EstadoSuscriptor = Literal["pendiente", "confirmado", "baja"]


class SuscribirIn(BaseModel):
    correo: EmailStr
    sitio_web: str | None = None  # trampa para robots (campo oculto)


class TokenIn(BaseModel):
    token: str


class Aviso(BaseModel):
    mensaje: str


class SuscriptorOut(BaseModel):
    id: int
    correo: str
    estado: EstadoSuscriptor
    creado_en: datetime
    confirmado_en: datetime | None
    baja_en: datetime | None


class ConteoSuscriptores(BaseModel):
    confirmado: int
    pendiente: int
    baja: int
    nuevos_30d: int  # confirmados en los últimos 30 días


class PaginaSuscriptores(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    conteo: ConteoSuscriptores
    suscriptores: list[SuscriptorOut]


class ArticuloParaEnviar(BaseModel):
    id: int
    titulo: str
    slug: str
    publicado_en: datetime
    enviado_en: datetime | None  # la última vez que se mandó al boletín


class EnviarIn(BaseModel):
    articulo_id: int


class EnvioOut(BaseModel):
    id: int
    asunto: str
    articulo_slug: str | None
    estado: Literal["enviando", "enviado", "error"]
    total: int
    enviados: int
    fallidos: int
    creado_en: datetime
    terminado_en: datetime | None
