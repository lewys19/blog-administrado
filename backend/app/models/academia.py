"""Academia Digital: cursos que se venden por WhatsApp, agrupados en categorías propias.

Las categorías son aparte de las del blog: «QA Testing» o «Matemáticas» no tienen por qué ser temas de artículos.
"""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class NivelCurso(StrEnum):
    PRINCIPIANTE = "principiante"
    INTERMEDIO = "intermedio"
    AVANZADO = "avanzado"


class TipoRecurso(StrEnum):
    CURSO = "curso"
    MANUAL = "manual"
    SEPARATA = "separata"
    SISTEMA = "sistema"  # software propio: POS, CRM, automatización


class GrupoEtiqueta(StrEnum):
    CURSOS = "cursos"
    MANUALES = "manuales"
    SISTEMAS = "sistemas"


class CategoriaAcademia(Base):
    __tablename__ = "academia_categorias"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), unique=True)
    slug: Mapped[str] = mapped_column(String(70), unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(300))
    orden: Mapped[int] = mapped_column(SmallInteger, default=0)


class Curso(Base):
    """Lo que ofrece la Academia. Cursos, manuales, separatas y sistemas comparten ficha: cambia `tipo`."""

    __tablename__ = "cursos"

    id: Mapped[int] = mapped_column(primary_key=True)
    categoria_id: Mapped[int] = mapped_column(ForeignKey("academia_categorias.id", ondelete="RESTRICT"), index=True)
    tipo: Mapped[TipoRecurso] = mapped_column(
        Enum(TipoRecurso, name="tipo_recurso", values_callable=lambda e: [x.value for x in e]),
        default=TipoRecurso.CURSO,
        server_default="curso",
        index=True,
    )
    titulo: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(130), unique=True)
    descripcion: Mapped[str] = mapped_column(Text)
    temario: Mapped[str] = mapped_column(Text, default="")  # un tema por línea
    tecnologias: Mapped[str] = mapped_column(String(300), default="", server_default="")  # separadas por coma
    instalacion: Mapped[str] = mapped_column(Text, default="", server_default="")  # cómo instalar un sistema
    nivel: Mapped[NivelCurso] = mapped_column(
        Enum(NivelCurso, name="nivel_curso", values_callable=lambda e: [x.value for x in e])
    )
    horas: Mapped[int | None] = mapped_column(SmallInteger)
    precio_anterior: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))  # el tachado; vacío = sin oferta
    precio: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    enlace: Mapped[str | None] = mapped_column(String(500))  # material en Drive u otro; público solo si es gratis
    portada_clave: Mapped[str | None] = mapped_column(String(200))
    destacado: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    publicado: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    categoria: Mapped[CategoriaAcademia] = relationship()


class EtiquetaAcademia(Base):
    """Atajo de la columna derecha: al hacer clic busca su nombre en los cursos."""

    __tablename__ = "academia_etiquetas"
    __table_args__ = (UniqueConstraint("grupo", "nombre", name="uq_academia_etiquetas_grupo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(40))
    grupo: Mapped[GrupoEtiqueta] = mapped_column(
        Enum(GrupoEtiqueta, name="grupo_etiqueta", values_callable=lambda e: [x.value for x in e])
    )
    orden: Mapped[int] = mapped_column(SmallInteger, default=0)


class AnuncioAcademia(Base):
    """Publicidad de terceros en la columna derecha. Sin anuncios activos sale un curso propio."""

    __tablename__ = "academia_anuncios"

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(80))
    enlace: Mapped[str] = mapped_column(String(500))
    imagen_clave: Mapped[str | None] = mapped_column(String(200))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
