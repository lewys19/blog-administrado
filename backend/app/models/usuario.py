from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, false, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.permisos import ADMINISTRADOR, PERMISOS


class Rol(Base):
    """Rol del panel (Administrador, Editor, Redactor, Invitado…). Los lectores no tienen rol."""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(40), unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(200))
    permisos: Mapped[list[str]] = mapped_column(ARRAY(String(40)), default=list)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Usuario(Base):
    """Todo parte de aquí: lectores, suscriptores y autores son usuarios; el rol decide si entra al panel."""

    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    # Solo visual (perfil de autor /autores/<username>): las relaciones van por id.
    username: Mapped[str] = mapped_column(String(30), unique=True)
    nombre: Mapped[str] = mapped_column(String(80))
    biografia: Mapped[str | None] = mapped_column(Text)
    avatar_clave: Mapped[str | None] = mapped_column(String(200))
    hash_contrasena: Mapped[str] = mapped_column(String(255))
    rol_id: Mapped[int | None] = mapped_column(ForeignKey("roles.id", ondelete="RESTRICT"), index=True)
    # Bloqueado por moderación: no puede ingresar ni comentar.
    bloqueado: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    acepto_terminos_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    ultimo_ingreso_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Borrado lógico: la cuenta se anonimiza y no puede volver a entrar.
    eliminado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    rol: Mapped[Rol | None] = relationship(lazy="joined")

    @property
    def en_panel(self) -> bool:
        return self.rol_id is not None

    @property
    def es_administrador(self) -> bool:
        return self.rol_id == ADMINISTRADOR

    @property
    def permisos(self) -> list[str]:
        if self.es_administrador:
            return list(PERMISOS)
        return list(self.rol.permisos) if self.rol else []

    def puede(self, permiso: str) -> bool:
        return permiso in self.permisos


class TokenRefresco(Base):
    __tablename__ = "tokens_refresco"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    huella: Mapped[str] = mapped_column(String(64), unique=True)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revocado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
