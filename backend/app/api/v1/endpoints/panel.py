"""Panel administrativo. Cada ruta pide un permiso (app.core.permisos); el Administrador los tiene todos."""

from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import Db, EditarUsuarios, GestionarRoles, MiembroPanel, VerUsuarios
from app.schemas.panel import (
    AsignarRolIn,
    PaginaUsuarios,
    PermisoOut,
    ResumenOut,
    RolIn,
    RolOut,
    UsuarioCambiosAdmin,
    UsuarioFilaOut,
)
from app.services import panel

router = APIRouter(prefix="/panel", tags=["Panel"])


@router.get("/resumen", response_model=ResumenOut)
def resumen(_quien: MiembroPanel, db: Db) -> ResumenOut:
    return panel.resumen(db)


# ---------- Usuarios ----------


@router.get("/usuarios", response_model=PaginaUsuarios)
def listar_usuarios(
    _quien: VerUsuarios,
    db: Db,
    q: Annotated[str | None, Query(max_length=100, description="Nombre, correo, @username o número")] = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginaUsuarios:
    return panel.listar_usuarios(db, q, pagina, por_pagina)


@router.get("/usuarios/{usuario_id}", response_model=UsuarioFilaOut)
def ver_usuario(usuario_id: int, _quien: VerUsuarios, db: Db) -> UsuarioFilaOut:
    return panel.ver_usuario(db, usuario_id)


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioFilaOut)
def editar_usuario(usuario_id: int, cambios: UsuarioCambiosAdmin, quien: EditarUsuarios, db: Db) -> UsuarioFilaOut:
    """Nombre y bloqueo. Bloquear cierra todas sus sesiones al instante."""
    return panel.editar_usuario(db, quien, usuario_id, cambios)


@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_usuario(usuario_id: int, quien: EditarUsuarios, db: Db) -> Response:
    """Borrado lógico: se anonimiza y pierde el acceso."""
    panel.eliminar_usuario(db, quien, usuario_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/usuarios/{usuario_id}/rol", response_model=UsuarioFilaOut)
def asignar_rol(usuario_id: int, datos: AsignarRolIn, quien: GestionarRoles, db: Db) -> UsuarioFilaOut:
    return panel.asignar_rol(db, quien, usuario_id, datos.rol_id)


# ---------- Roles ----------


@router.get("/permisos", response_model=list[PermisoOut])
def listar_permisos(_quien: MiembroPanel) -> list[PermisoOut]:
    return panel.permisos()


@router.get("/roles", response_model=list[RolOut])
def listar_roles(_quien: MiembroPanel, db: Db) -> list[RolOut]:
    return panel.listar_roles(db)


@router.post("/roles", response_model=RolOut, status_code=status.HTTP_201_CREATED)
def crear_rol(datos: RolIn, _quien: GestionarRoles, db: Db) -> RolOut:
    return panel.crear_rol(db, datos)


@router.put("/roles/{rol_id}", response_model=RolOut)
def editar_rol(rol_id: int, datos: RolIn, _quien: GestionarRoles, db: Db) -> RolOut:
    return panel.editar_rol(db, rol_id, datos)


@router.delete("/roles/{rol_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_rol(rol_id: int, _quien: GestionarRoles, db: Db) -> Response:
    panel.eliminar_rol(db, rol_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
