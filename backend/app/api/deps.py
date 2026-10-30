"""Dependencias reutilizables para los endpoints.

- `get_db` abre una sesión de base de datos por petición y la cierra al terminar.
- `usuario_actual` exige el token de acceso (Authorization: Bearer ...).
- `requiere_permiso(...)` exige un permiso del panel (ver app.core.permisos).
"""

from collections.abc import Callable, Generator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import leer_token_acceso
from app.models import Usuario


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


Db = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False, description="token_acceso que devuelve POST /auth/login")


def usuario_actual(
    db: Db, credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]
) -> Usuario:
    usuario_id = leer_token_acceso(credenciales.credentials) if credenciales else None
    # Se busca en la base en cada petición: si se borra o bloquea la cuenta, pierde el acceso al instante.
    usuario = db.get(Usuario, usuario_id) if usuario_id else None
    if usuario is None or usuario.eliminado_en is not None or usuario.bloqueado:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Inicia sesión para continuar.", headers={"WWW-Authenticate": "Bearer"}
        )
    return usuario


UsuarioActual = Annotated[Usuario, Depends(usuario_actual)]


def miembro_panel(usuario: UsuarioActual) -> Usuario:
    """Cualquiera con rol. Los lectores no entran."""
    if not usuario.en_panel:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta no tiene acceso al panel.")
    return usuario


MiembroPanel = Annotated[Usuario, Depends(miembro_panel)]


def requiere_permiso(permiso: str) -> Callable[[Usuario], Usuario]:
    """El Administrador pasa siempre; el resto, si su rol tiene el permiso."""

    def verificar(usuario: UsuarioActual) -> Usuario:
        if not usuario.puede(permiso):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para esta acción.")
        return usuario

    return verificar


VerUsuarios = Annotated[Usuario, Depends(requiere_permiso("usuarios.ver"))]
EditarUsuarios = Annotated[Usuario, Depends(requiere_permiso("usuarios.editar"))]
GestionarRoles = Annotated[Usuario, Depends(requiere_permiso("roles.gestionar"))]
EscribirArticulos = Annotated[Usuario, Depends(requiere_permiso("articulos.escribir"))]
GestionarCategorias = Annotated[Usuario, Depends(requiere_permiso("categorias.gestionar"))]
VerEstadisticas = Annotated[Usuario, Depends(requiere_permiso("estadisticas.ver"))]
ModerarComentarios = Annotated[Usuario, Depends(requiere_permiso("comentarios.moderar"))]
GestionarNewsletter = Annotated[Usuario, Depends(requiere_permiso("newsletter.gestionar"))]


def ip_cliente(request: Request) -> str:
    """Detrás de Caddy, uvicorn la toma de X-Forwarded-For (--proxy-headers)."""
    return request.client.host if request.client else "desconocida"


Ip = Annotated[str, Depends(ip_cliente)]
