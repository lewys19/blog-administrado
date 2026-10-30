"""Boletín: suscriptores (con doble confirmación) y cada envío de un artículo a todos ellos."""

import secrets
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.contenido import Articulo


class EstadoSuscriptor(StrEnum):
    PENDIENTE = "pendiente"  # todavía no abrió el enlace de confirmación
    CONFIRMADO = "confirmado"  # recibe el boletín
    BAJA = "baja"  # se dio de baja (se guarda para no volver a escribirle)


class EstadoEnvio(StrEnum):
    ENVIANDO = "enviando"
    ENVIADO = "enviado"
    ERROR = "error"  # el servidor de correo no respondió


def _token() -> str:
    return secrets.token_urlsafe(24)


class Suscriptor(Base):
    __tablename__ = "suscriptores"

    id: Mapped[int] = mapped_column(primary_key=True)
    correo: Mapped[str] = mapped_column(String(254), unique=True)
    estado: Mapped[str] = mapped_column(String(10), default=EstadoSuscriptor.PENDIENTE, index=True)
    # Va en los enlaces de confirmar y darse de baja: quien lo tiene es el dueño del correo.
    token: Mapped[str] = mapped_column(String(40), unique=True, default=_token)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    confirmado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    baja_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    aviso_enviado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # último correo de confirmación


class Envio(Base):
    __tablename__ = "envios"

    id: Mapped[int] = mapped_column(primary_key=True)
    articulo_id: Mapped[int | None] = mapped_column(ForeignKey("articulos.id", ondelete="SET NULL"), index=True)
    autor_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"))
    asunto: Mapped[str] = mapped_column(String(200))
    estado: Mapped[str] = mapped_column(String(10), default=EstadoEnvio.ENVIANDO)
    total: Mapped[int] = mapped_column(Integer, default=0)
    enviados: Mapped[int] = mapped_column(Integer, default=0)
    fallidos: Mapped[int] = mapped_column(Integer, default=0)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    terminado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    articulo: Mapped[Articulo | None] = relationship()
