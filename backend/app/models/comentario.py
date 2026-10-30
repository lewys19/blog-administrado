"""Comentarios de los lectores en los artículos. Se publican cuando un moderador los aprueba.

Privacidad: el correo solo lo ve el equipo del panel. `huella` es un resumen (hash) de la IP con la
clave secreta: sirve para reconocer a quien ya mandó spam, sin guardar su IP.
"""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.contenido import Articulo


class EstadoComentario(StrEnum):
    PENDIENTE = "pendiente"  # espera a un moderador
    APROBADO = "aprobado"  # se ve en el artículo
    SPAM = "spam"  # oculto; lo que llegue de la misma huella va directo aquí


class Comentario(Base):
    __tablename__ = "comentarios"
    __table_args__ = (Index("ix_comentarios_articulo_estado", "articulo_id", "estado"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    articulo_id: Mapped[int] = mapped_column(ForeignKey("articulos.id", ondelete="CASCADE"))
    nombre: Mapped[str] = mapped_column(String(60))
    correo: Mapped[str] = mapped_column(String(254), index=True)
    contenido: Mapped[str] = mapped_column(Text)
    estado: Mapped[str] = mapped_column(String(10), default=EstadoComentario.PENDIENTE, index=True)
    huella: Mapped[str] = mapped_column(String(16), index=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    moderado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    articulo: Mapped[Articulo] = relationship()
