import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Periodo = Literal["7d", "30d", "12m"]


class VisitaIn(BaseModel):
    ruta: str = Field(min_length=1, max_length=300)
    referente: str | None = Field(default=None, max_length=500)  # document.referrer o utm_source


class VisitaOut(BaseModel):
    id: uuid.UUID | None  # null: no se contó (robot, prefetch o demasiadas seguidas)


class LecturaIn(BaseModel):
    id: uuid.UUID
    segundos: int = Field(ge=0, le=86_400)
    profundidad: int = Field(ge=0, le=100)


class Punto(BaseModel):
    etiqueta: str  # "2026-10-29" (por día) o "2026-10" (por mes)
    visitas: int
    lectores: int


class Cuenta(BaseModel):
    clave: str | None  # país, origen, dominio o dispositivo; None = desconocido
    visitas: int


class ArticuloVisto(BaseModel):
    id: int
    titulo: str
    slug: str
    visitas: int
    segundos_promedio: int
    profundidad_promedio: int


class Totales(BaseModel):
    visitas: int
    visitas_anterior: int  # el periodo anterior de igual largo, para comparar
    lectores: int  # únicos de cada día, sumados
    segundos_promedio: int  # en artículos, solo visitas que informaron tiempo
    profundidad_promedio: int


class EstadisticasOut(BaseModel):
    periodo: Periodo
    desde: date
    hasta: date
    totales: Totales
    serie: list[Punto]
    paises: list[Cuenta]
    origenes: list[Cuenta]
    referentes: list[Cuenta]
    dispositivos: list[Cuenta]
    articulos: list[ArticuloVisto]


class ResumenVisitas(BaseModel):
    """Lo de visitas que muestra el dashboard (solo a quien puede ver estadísticas)."""

    hoy: int
    lectores_hoy: int
    mes: int
    mes_anterior: int  # el mes pasado hasta el mismo día, para comparar justo
    segundos_promedio_mes: int
    por_mes: list[Punto]  # los últimos 12 meses
