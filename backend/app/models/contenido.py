from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    Column,
    Computed,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Table,
    Text,
    false,
    func,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EstadoArticulo(StrEnum):
    BORRADOR = "borrador"
    REVISION = "revision"  # el autor lo envió; un Editor lo publica
    PROGRAMADO = "programado"  # sale solo en `publicado_en`
    PUBLICADO = "publicado"


class Categoria(Base):
    """Dos niveles como máximo: Programación › Python."""

    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60))
    slug: Mapped[str] = mapped_column(String(70), unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(300))
    padre_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id", ondelete="RESTRICT"))
    orden: Mapped[int] = mapped_column(SmallInteger, default=0)


class Etiqueta(Base):
    __tablename__ = "etiquetas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(40), unique=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True)


articulo_etiqueta = Table(
    "articulo_etiqueta",
    Base.metadata,
    Column("articulo_id", ForeignKey("articulos.id", ondelete="CASCADE"), primary_key=True),
    Column("etiqueta_id", ForeignKey("etiquetas.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class Articulo(Base):
    __tablename__ = "articulos"
    __table_args__ = (
        # Búsqueda en español (raíces de palabras: «programar» encuentra «programación»).
        Index("ix_articulos_busqueda", "busqueda", postgresql_using="gin"),
        Index("ix_articulos_publicado_en", "estado", "publicado_en"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(160))
    # URL amigable (/blog/<slug>). Se genera del título; se puede editar.
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    resumen: Mapped[str | None] = mapped_column(String(400))  # bajada bajo el título y en las tarjetas
    contenido: Mapped[str] = mapped_column(Text, default="")  # Markdown, como lo escribe el autor
    # HTML listo para mostrar: se genera al guardar (código resaltado y limpio de scripts).
    contenido_html: Mapped[str] = mapped_column(Text, default="")
    imagen_clave: Mapped[str | None] = mapped_column(String(200))
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id", ondelete="RESTRICT"), index=True)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"), index=True)
    estado: Mapped[EstadoArticulo] = mapped_column(
        Enum(EstadoArticulo, name="estado_articulo", values_callable=lambda e: [m.value for m in e]),
        default=EstadoArticulo.BORRADOR,
    )
    destacado: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    minutos_lectura: Mapped[int] = mapped_column(SmallInteger, default=1)
    # Fecha de publicación (o la programada). None mientras es borrador.
    publicado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # SEO: si están vacíos, se usan el título y el resumen.
    meta_titulo: Mapped[str | None] = mapped_column(String(70))
    meta_descripcion: Mapped[str | None] = mapped_column(String(170))
    palabras_clave: Mapped[str | None] = mapped_column(String(200))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    busqueda: Mapped[str] = mapped_column(
        TSVECTOR,
        Computed(
            "setweight(to_tsvector('spanish', coalesce(titulo, '')), 'A') || "
            "setweight(to_tsvector('spanish', coalesce(resumen, '')), 'B') || "
            "setweight(to_tsvector('spanish', coalesce(contenido, '')), 'C')",
            persisted=True,
        ),
    )

    categoria: Mapped[Categoria | None] = relationship()
    autor: Mapped["Usuario"] = relationship()  # noqa: F821
    etiquetas: Mapped[list[Etiqueta]] = relationship(secondary=articulo_etiqueta, order_by=Etiqueta.nombre)
