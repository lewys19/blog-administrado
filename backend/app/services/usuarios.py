"""Cuenta propia: ver y cambiar sus datos."""

from fastapi import status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import usernames
from app.core.errores import ErrorNegocio
from app.models import Usuario
from app.schemas.usuario import YoCambios, YoOut


def username_libre(db: Session, texto: str) -> str:
    """Un username disponible a partir de un nombre: «Lewys Ramos» → lewys-ramos, lewys-ramos-2…"""
    base = usernames.base_desde(texto)
    tomados = set(db.scalars(select(Usuario.username).where(Usuario.username.like(f"{base}%"))))
    candidato, n = base, 1
    while candidato in tomados or usernames.problema(candidato):
        n += 1
        candidato = f"{base}-{n}"
    return candidato


def perfil(usuario: Usuario) -> YoOut:
    return YoOut(
        id=usuario.id,
        email=usuario.email,
        username=usuario.username,
        nombre=usuario.nombre,
        en_panel=usuario.en_panel,
        biografia=usuario.biografia,
        creado_en=usuario.creado_en,
        rol=usuario.rol.nombre if usuario.rol else None,
        permisos=usuario.permisos,
    )


def actualizar(db: Session, usuario: Usuario, cambios: YoCambios) -> YoOut:
    datos = cambios.model_dump(exclude_unset=True)
    if datos.get("nombre"):
        usuario.nombre = datos["nombre"]
    if "biografia" in datos:
        usuario.biografia = datos["biografia"] or None
    if datos.get("username"):
        usuario.username = datos["username"]
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Nombre de usuario no disponible.") from None
    return perfil(usuario)
