from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.core import usernames


class UsuarioOut(BaseModel):
    """Lo que la web guarda de la sesión."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    nombre: str
    en_panel: bool


class YoOut(UsuarioOut):
    biografia: str | None
    creado_en: datetime
    rol: str | None  # «Administrador», «Editor»… o None (lector, no entra al panel)
    permisos: list[str]


class YoCambios(BaseModel):
    """Datos propios que se pueden cambiar. El correo no: es con lo que se ingresa."""

    nombre: Annotated[str, StringConstraints(strip_whitespace=True), Field(min_length=2, max_length=80)] | None = None
    biografia: Annotated[str, StringConstraints(strip_whitespace=True), Field(max_length=500)] | None = None
    username: str | None = None

    @field_validator("username")
    @classmethod
    def _username(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        valor = valor.strip().lower().removeprefix("@")
        if motivo := usernames.problema(valor):
            raise ValueError(motivo)
        return valor
