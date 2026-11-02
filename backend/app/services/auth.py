"""Cuentas y sesiones: registro, ingreso (con límite de intentos), refresco con rotación y salida."""

from datetime import timedelta

import redis
from fastapi import status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import usernames
from app.core.cache import cliente_redis
from app.core.config import settings
from app.core.errores import ErrorNegocio
from app.core.fechas import ahora
from app.core.permisos import COLABORADOR
from app.core.security import (
    HASH_SEÑUELO,
    crear_token_acceso,
    hash_contrasena,
    huella,
    nuevo_token_refresco,
    verificar_contrasena,
)
from app.models import Rol, TokenRefresco, Usuario
from app.schemas.auth import LoginIn, RegistroIn, SesionOut
from app.schemas.usuario import UsuarioOut
from app.services.usuarios import username_libre


def _normalizar(email: str) -> str:
    return email.strip().lower()


def abrir_sesion(db: Session, usuario: Usuario) -> SesionOut:
    acceso, expira = crear_token_acceso(usuario.id)
    valor, huella_refresco = nuevo_token_refresco()
    db.add(
        TokenRefresco(
            usuario_id=usuario.id,
            huella=huella_refresco,
            expira_en=ahora() + timedelta(days=settings.DIAS_TOKEN_REFRESCO),
        )
    )
    usuario.ultimo_ingreso_en = ahora()
    db.commit()
    return SesionOut(
        token_acceso=acceso,
        token_refresco=valor,
        acceso_expira_en=expira,
        usuario=UsuarioOut.model_validate(usuario),
    )


def registrar(db: Session, datos: RegistroIn) -> SesionOut:
    usuario = Usuario(
        email=_normalizar(datos.email),
        username=username_libre(db, datos.nombre),
        nombre=datos.nombre,
        hash_contrasena=hash_contrasena(datos.contrasena),
        acepto_terminos_en=ahora(),
        # Quien se registra es Colaborador: entra al panel y escribe sus guías.
        rol_id=db.scalar(select(Rol.id).where(Rol.nombre == COLABORADOR)),
    )
    db.add(usuario)
    try:
        db.flush()
    except IntegrityError as error:
        db.rollback()
        if "username" in str(error.orig):  # dos registros con el mismo nombre al mismo tiempo
            raise ErrorNegocio(status.HTTP_409_CONFLICT, "Inténtalo otra vez en un momento.") from None
        raise ErrorNegocio(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo.") from None
    return abrir_sesion(db, usuario)


# ---------- Límite de intentos de ingreso ----------
# Por cuenta y por IP: frena a quien prueba contraseñas sin bloquear a todos. Si Redis no responde,
# se deja pasar (mejor un ingreso sin límite que nadie pueda entrar).


def _claves_intentos(email: str, ip: str) -> list[str]:
    return [f"login:cuenta:{email}", f"login:ip:{ip}"]


def _bloqueado(email: str, ip: str) -> bool:
    try:
        valores = cliente_redis().mget(_claves_intentos(email, ip))
    except redis.RedisError:
        return False
    return any(v is not None and int(v) >= settings.MAX_INTENTOS_LOGIN for v in valores)  # type: ignore[union-attr]


def _contar_fallo(email: str, ip: str) -> None:
    try:
        cliente = cliente_redis()
        for clave in _claves_intentos(email, ip):
            if cliente.incr(clave) == 1:
                cliente.expire(clave, settings.MINUTOS_BLOQUEO_LOGIN * 60)
    except redis.RedisError:
        pass


def _limpiar_fallos(email: str) -> None:
    try:
        cliente_redis().delete(f"login:cuenta:{email}")
    except redis.RedisError:
        pass


def ingresar(db: Session, datos: LoginIn, ip: str) -> SesionOut:
    email = _normalizar(datos.email)
    if _bloqueado(email, ip):
        raise ErrorNegocio(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Demasiados intentos. Espera {settings.MINUTOS_BLOQUEO_LOGIN} minutos e inténtalo de nuevo.",
        )
    usuario = db.scalar(select(Usuario).where(Usuario.email == email, Usuario.eliminado_en.is_(None)))
    # Siempre se verifica un hash, exista o no la cuenta: así el tiempo no delata qué cuentas existen.
    valida = verificar_contrasena(datos.contrasena, usuario.hash_contrasena if usuario else HASH_SEÑUELO)
    if usuario is None or not valida:
        _contar_fallo(email, ip)
        raise ErrorNegocio(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    if usuario.bloqueado:
        raise ErrorNegocio(status.HTTP_403_FORBIDDEN, "Esta cuenta está bloqueada.")
    _limpiar_fallos(email)
    return abrir_sesion(db, usuario)


def refrescar(db: Session, valor: str) -> SesionOut:
    """Cambia un token de refresco por una sesión nueva. El usado queda revocado (rotación)."""
    token = db.scalar(select(TokenRefresco).where(TokenRefresco.huella == huella(valor)).with_for_update())
    momento = ahora()
    if token is None or token.expira_en <= momento:
        raise ErrorNegocio(status.HTTP_401_UNAUTHORIZED, "La sesión venció. Vuelve a ingresar.")
    if token.revocado_en is not None:
        # Un token ya usado que vuelve a aparecer = posible robo: se cierran todas sus sesiones.
        revocar_todas(db, token.usuario_id)
        db.commit()
        raise ErrorNegocio(status.HTTP_401_UNAUTHORIZED, "La sesión venció. Vuelve a ingresar.")
    usuario = db.get(Usuario, token.usuario_id)
    if usuario is None or usuario.eliminado_en is not None or usuario.bloqueado:
        raise ErrorNegocio(status.HTTP_401_UNAUTHORIZED, "La sesión venció. Vuelve a ingresar.")
    token.revocado_en = momento
    return abrir_sesion(db, usuario)


def salir(db: Session, valor: str) -> None:
    token = db.scalar(select(TokenRefresco).where(TokenRefresco.huella == huella(valor)))
    if token is not None and token.revocado_en is None:
        token.revocado_en = ahora()
        db.commit()


def revocar_todas(db: Session, usuario_id: int) -> None:
    momento = ahora()
    for token in db.scalars(
        select(TokenRefresco).where(TokenRefresco.usuario_id == usuario_id, TokenRefresco.revocado_en.is_(None))
    ):
        token.revocado_en = momento


def eliminar_cuenta(db: Session, usuario: Usuario) -> None:
    """Borrado a pedido del titular (Ley 29733): se anonimizan sus datos y se cierran sus sesiones."""
    usuario.eliminado_en = ahora()
    usuario.email = f"eliminado-{usuario.id}@zcorp.invalid"
    usuario.nombre = "Cuenta eliminada"
    usuario.username = usernames.de_cuenta_eliminada(usuario.id)
    usuario.biografia = None
    usuario.avatar_clave = None
    usuario.rol_id = None
    usuario.hash_contrasena = HASH_SEÑUELO
    revocar_todas(db, usuario.id)
    db.commit()
