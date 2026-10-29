from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.core.permisos import PERMISOS


class ResumenOut(BaseModel):
    """Cifras del dashboard. Las de visitas, ingresos, artículos y comentarios llegan en sus sprints."""

    usuarios: int
    usuarios_nuevos_7d: int
    usuarios_activos_hoy: int  # ingresaron hoy (UTC)
    equipo: int  # cuentas con acceso al panel


class RolCorto(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str


class UsuarioFilaOut(BaseModel):
    id: int
    email: str
    username: str
    nombre: str
    rol: RolCorto | None
    bloqueado: bool
    creado_en: datetime
    ultimo_ingreso_en: datetime | None


class PaginaUsuarios(BaseModel):
    total: int
    pagina: int
    por_pagina: int
    usuarios: list[UsuarioFilaOut]


class UsuarioCambiosAdmin(BaseModel):
    nombre: Annotated[str, StringConstraints(strip_whitespace=True), Field(min_length=2, max_length=80)] | None = None
    bloqueado: bool | None = None


class AsignarRolIn(BaseModel):
    rol_id: int | None  # None = lector, sin acceso al panel


class PermisoOut(BaseModel):
    clave: str
    texto: str


class RolOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    permisos: list[str]
    usuarios: int
    fijo: bool  # el Administrador no se edita ni se borra


class RolIn(BaseModel):
    nombre: Annotated[str, StringConstraints(strip_whitespace=True), Field(min_length=3, max_length=40)]
    descripcion: Annotated[str, StringConstraints(strip_whitespace=True), Field(max_length=200)] | None = None
    permisos: list[str]

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, valor: str) -> str:
        if valor.lower() == "administrador":
            raise ValueError("«Administrador» está reservado.")
        return valor

    @field_validator("permisos")
    @classmethod
    def _permisos(cls, valor: list[str]) -> list[str]:
        desconocidos = [p for p in valor if p not in PERMISOS]
        if desconocidos:
            raise ValueError(f"Permisos desconocidos: {', '.join(desconocidos)}")
        return [p for p in PERMISOS if p in valor]  # sin repetidos y en el orden del catálogo
