"""Fuentes externas por RSS y las noticias que traen, antes de convertirse en borradores."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EstadoNoticia(StrEnum):
    NUEVA = "nueva"
    USADA = "usada"  # ya tiene su borrador
    DESCARTADA = "descartada"


class Fuente(Base):
    __tablename__ = "fuentes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(80))
    url: Mapped[str] = mapped_column(String(500), unique=True)
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id", ondelete="SET NULL"))
    activa: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    palabras: Mapped[str] = mapped_column(String(300), default="", server_default="")  # filtro, separadas por coma
    leida_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ultimo_error: Mapped[str | None] = mapped_column(String(300))


class NoticiaFuente(Base):
    __tablename__ = "noticias_fuente"

    id: Mapped[int] = mapped_column(primary_key=True)
    fuente_id: Mapped[int] = mapped_column(ForeignKey("fuentes.id", ondelete="CASCADE"), index=True)
    titulo: Mapped[str] = mapped_column(String(300))
    enlace: Mapped[str] = mapped_column(String(700), unique=True)  # evita repetir la misma noticia
    extracto: Mapped[str] = mapped_column(Text, default="", server_default="")
    publicado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estado: Mapped[EstadoNoticia] = mapped_column(
        Enum(EstadoNoticia, name="estado_noticia", values_callable=lambda e: [x.value for x in e]),
        default=EstadoNoticia.NUEVA,
        server_default="nueva",
        index=True,
    )
    articulo_id: Mapped[int | None] = mapped_column(ForeignKey("articulos.id", ondelete="SET NULL"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    fuente: Mapped[Fuente] = relationship()
