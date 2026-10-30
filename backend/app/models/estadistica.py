"""Visitas del blog público, para la analítica del panel.

Privacidad: no se guarda la IP ni cookies. `visitante` es un resumen (hash) de IP + navegador + día
con la clave secreta: sirve para contar lectores únicos de cada día y no permite saber quién es.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, SmallInteger, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Visita(Base):
    __tablename__ = "visitas"
    __table_args__ = (Index("ix_visitas_articulo_fecha", "articulo_id", "creado_en"),)

    # UUID al azar: con él la página informa el tiempo de lectura, y nadie puede adivinar el de otra visita.
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    ruta: Mapped[str] = mapped_column(String(300))
    articulo_id: Mapped[int | None] = mapped_column(ForeignKey("articulos.id", ondelete="SET NULL"))
    visitante: Mapped[str] = mapped_column(String(16))
    pais: Mapped[str | None] = mapped_column(String(2))  # ISO 3166, p. ej. "PE"
    origen: Mapped[str] = mapped_column(String(12))  # directo, buscador, redes, sitios
    referente: Mapped[str | None] = mapped_column(String(120))  # dominio de donde llegó
    dispositivo: Mapped[str] = mapped_column(String(10))  # movil, tablet, escritorio
    segundos: Mapped[int] = mapped_column(Integer, default=0, server_default="0")  # tiempo con la página a la vista
    profundidad: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")  # % que bajó
