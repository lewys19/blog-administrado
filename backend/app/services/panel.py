"""Panel: resumen del dashboard, usuarios (tabla, edición, bloqueo, rol) y roles con permisos."""

from datetime import UTC, datetime, timedelta

from fastapi import status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errores import ErrorNegocio
from app.core.fechas import ahora
from app.core.permisos import ADMINISTRADOR, PERMISOS
from app.models import Articulo, EstadoArticulo, Rol, Usuario
from app.schemas.panel import (
    PaginaUsuarios,
    PermisoOut,
    ResumenOut,
    RolCorto,
    RolIn,
    RolOut,
    UsuarioCambiosAdmin,
    UsuarioFilaOut,
)
from app.services import articulos, auth


def resumen(db: Session) -> ResumenOut:
    vivos = select(func.count()).select_from(Usuario).where(Usuario.eliminado_en.is_(None))
    inicio_de_hoy = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    return ResumenOut(
        usuarios=db.scalar(vivos) or 0,
        usuarios_nuevos_7d=db.scalar(vivos.where(Usuario.creado_en >= ahora() - timedelta(days=7))) or 0,
        usuarios_activos_hoy=db.scalar(vivos.where(Usuario.ultimo_ingreso_en >= inicio_de_hoy)) or 0,
        equipo=db.scalar(vivos.where(Usuario.rol_id.is_not(None))) or 0,
        articulos_publicados=articulos.contar_publicados(db),
        articulos_en_revision=db.scalar(
            select(func.count()).select_from(Articulo).where(Articulo.estado == EstadoArticulo.REVISION)
        )
        or 0,
    )


# ---------- Usuarios ----------


def _consulta_usuarios(q: str | None) -> Select[tuple[Usuario]]:
    consulta = select(Usuario).where(Usuario.eliminado_en.is_(None))
    if q and q.strip():
        texto = q.strip().lower().removeprefix("@")
        patron = f"%{texto}%"
        condiciones = [Usuario.nombre.ilike(patron), Usuario.email.ilike(patron), Usuario.username.ilike(patron)]
        if texto.isdigit():
            condiciones.append(Usuario.id == int(texto))
        consulta = consulta.where(or_(*condiciones))
    return consulta


def _fila(u: Usuario) -> UsuarioFilaOut:
    return UsuarioFilaOut(
        id=u.id, email=u.email, username=u.username, nombre=u.nombre,
        rol=RolCorto.model_validate(u.rol) if u.rol else None,
        bloqueado=u.bloqueado, creado_en=u.creado_en, ultimo_ingreso_en=u.ultimo_ingreso_en,
    )  # fmt: skip


def listar_usuarios(db: Session, q: str | None, pagina: int, por_pagina: int) -> PaginaUsuarios:
    """Búsqueda por nombre, correo, username o número; el más nuevo primero."""
    consulta = _consulta_usuarios(q)
    total = db.scalar(select(func.count()).select_from(consulta.subquery())) or 0
    usuarios = db.scalars(
        consulta.order_by(Usuario.creado_en.desc(), Usuario.id.desc()).offset((pagina - 1) * por_pagina).limit(por_pagina)
    ).all()
    return PaginaUsuarios(total=total, pagina=pagina, por_pagina=por_pagina, usuarios=[_fila(u) for u in usuarios])


def _usuario_vivo(db: Session, usuario_id: int) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None or usuario.eliminado_en is not None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")
    return usuario


def _no_a_si_mismo_ni_a_un_administrador(quien: Usuario, u: Usuario, accion: str) -> None:
    if u.id == quien.id:
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, f"No puedes {accion} tu propia cuenta desde el panel.")
    if u.es_administrador and not quien.es_administrador:
        raise ErrorNegocio(status.HTTP_403_FORBIDDEN, f"Solo un Administrador puede {accion} a otro Administrador.")


def ver_usuario(db: Session, usuario_id: int) -> UsuarioFilaOut:
    return _fila(_usuario_vivo(db, usuario_id))


def editar_usuario(db: Session, quien: Usuario, usuario_id: int, cambios: UsuarioCambiosAdmin) -> UsuarioFilaOut:
    u = _usuario_vivo(db, usuario_id)
    datos = cambios.model_dump(exclude_unset=True)
    if datos.get("nombre"):
        u.nombre = datos["nombre"]
    if datos.get("bloqueado") is not None and datos["bloqueado"] != u.bloqueado:
        _no_a_si_mismo_ni_a_un_administrador(quien, u, "bloquear")
        u.bloqueado = datos["bloqueado"]
        if u.bloqueado:
            auth.revocar_todas(db, u.id)  # sale de todas sus sesiones al instante
    db.commit()
    return _fila(u)


def eliminar_usuario(db: Session, quien: Usuario, usuario_id: int) -> None:
    u = _usuario_vivo(db, usuario_id)
    _no_a_si_mismo_ni_a_un_administrador(quien, u, "eliminar")
    auth.eliminar_cuenta(db, u)


def asignar_rol(db: Session, quien: Usuario, usuario_id: int, rol_id: int | None) -> UsuarioFilaOut:
    u = _usuario_vivo(db, usuario_id)
    _no_a_si_mismo_ni_a_un_administrador(quien, u, "cambiar el rol de")
    if rol_id == ADMINISTRADOR and not quien.es_administrador:
        raise ErrorNegocio(status.HTTP_403_FORBIDDEN, "Solo un Administrador puede nombrar a otro Administrador.")
    if rol_id is not None and db.get(Rol, rol_id) is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Rol no encontrado.")
    u.rol_id = rol_id
    db.commit()
    db.refresh(u)
    return _fila(u)


# ---------- Roles ----------


def permisos() -> list[PermisoOut]:
    return [PermisoOut(clave=c, texto=t) for c, t in PERMISOS.items()]


def _rol_out(db: Session, rol: Rol) -> RolOut:
    cuantos = db.scalar(
        select(func.count()).select_from(Usuario).where(Usuario.rol_id == rol.id, Usuario.eliminado_en.is_(None))
    )
    fijo = rol.id == ADMINISTRADOR
    return RolOut(
        id=rol.id, nombre=rol.nombre, descripcion=rol.descripcion,
        permisos=list(PERMISOS) if fijo else list(rol.permisos), usuarios=cuantos or 0, fijo=fijo,
    )  # fmt: skip


def listar_roles(db: Session) -> list[RolOut]:
    return [_rol_out(db, r) for r in db.scalars(select(Rol).order_by(Rol.id)).all()]


def _rol_editable(db: Session, rol_id: int) -> Rol:
    rol = db.get(Rol, rol_id)
    if rol is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Rol no encontrado.")
    if rol.id == ADMINISTRADOR:
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, "El rol Administrador no se puede cambiar.")
    return rol


def _guardar_rol(db: Session, rol: Rol, datos: RolIn) -> RolOut:
    rol.nombre = datos.nombre
    rol.descripcion = datos.descripcion or None
    rol.permisos = datos.permisos
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Ya existe un rol con ese nombre.") from None
    return _rol_out(db, rol)


def crear_rol(db: Session, datos: RolIn) -> RolOut:
    rol = Rol()
    db.add(rol)
    return _guardar_rol(db, rol, datos)


def editar_rol(db: Session, rol_id: int, datos: RolIn) -> RolOut:
    return _guardar_rol(db, _rol_editable(db, rol_id), datos)


def eliminar_rol(db: Session, rol_id: int) -> None:
    rol = _rol_editable(db, rol_id)
    if _rol_out(db, rol).usuarios:
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Ese rol todavía tiene usuarios. Cámbiales el rol antes de eliminarlo.")
    for u in db.scalars(select(Usuario).where(Usuario.rol_id == rol.id)).all():  # cuentas eliminadas que lo tenían
        u.rol_id = None
    db.delete(rol)
    db.commit()
