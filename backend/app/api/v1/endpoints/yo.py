from fastapi import APIRouter, Response, status

from app.api.deps import Db, UsuarioActual
from app.schemas.usuario import YoCambios, YoOut
from app.services import auth, usuarios

router = APIRouter(prefix="/yo", tags=["Cuenta"])


@router.get("", response_model=YoOut)
def ver_perfil(usuario: UsuarioActual) -> YoOut:
    """Tu cuenta, con tu rol y permisos (la web decide con eso qué secciones del panel mostrar)."""
    return usuarios.perfil(usuario)


@router.patch("", response_model=YoOut)
def actualizar_perfil(cambios: YoCambios, usuario: UsuarioActual, db: Db) -> YoOut:
    """Nombre, biografía y nombre de usuario. El correo no se cambia aquí."""
    return usuarios.actualizar(db, usuario, cambios)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_cuenta(usuario: UsuarioActual, db: Db) -> Response:
    auth.eliminar_cuenta(db, usuario)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
