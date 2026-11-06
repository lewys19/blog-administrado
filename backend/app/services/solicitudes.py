"""Cursos de pago: el visitante pide un código, el administrador aprueba el pago y el código abre el material."""

import hashlib
import secrets

import redis
from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.cache import cliente_redis
from app.core.config import settings
from app.core.errores import ErrorNegocio
from app.core.fechas import ahora
from app.models import Curso, EstadoSolicitud, SolicitudCurso
from app.schemas.academia import AccesoOut, PanelSolicitudes, SolicitudCreada, SolicitudIn, SolicitudPanel

# Sin 0, O, 1 ni I: se dictan y se copian a mano sin confundirse.
ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
MAX_LISTADO = 200


def _generar_codigo() -> str:
    partes = ["".join(secrets.choice(ALFABETO) for _ in range(4)) for _ in range(2)]
    return "ZC-" + "-".join(partes)


def _superado(accion: str, ip: str, maximo: int) -> bool:
    """Cuenta por hora e IP. Sin Redis deja pasar: el código sigue siendo difícil de adivinar."""
    huella = hashlib.sha256(f"{settings.SECRET_KEY}|{accion}|{ip}".encode()).hexdigest()[:16]
    try:
        cliente = cliente_redis()
        clave = f"academia:{accion}:{huella}:{int(ahora().timestamp() // 3600)}"
        cuenta = cliente.incr(clave)
        if cuenta == 1:
            cliente.expire(clave, 3600)
        return int(cuenta) > maximo  # type: ignore[arg-type]
    except redis.RedisError:
        return False


def crear(db: Session, slug: str, datos: SolicitudIn, ip: str) -> SolicitudCreada:
    c = db.scalar(select(Curso).where(Curso.slug == slug, Curso.publicado.is_(True)))
    if c is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Curso no encontrado.")
    if c.precio == 0:
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, "Este curso es gratis: no necesita código.")
    if _superado("solicitud", ip, settings.MAX_SOLICITUDES_POR_HORA):
        raise ErrorNegocio(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiadas solicitudes. Prueba en una hora.")
    s = SolicitudCurso(
        curso_id=c.id, curso_titulo=c.titulo, codigo=_generar_codigo(), nombre=datos.nombre, whatsapp=datos.whatsapp
    )
    db.add(s)
    db.commit()
    return SolicitudCreada(codigo=s.codigo)


def acceder(db: Session, codigo: str, ip: str) -> AccesoOut:
    if _superado("codigo", ip, settings.MAX_CODIGOS_POR_HORA):
        raise ErrorNegocio(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados intentos. Prueba en una hora.")
    s = db.scalar(select(SolicitudCurso).where(SolicitudCurso.codigo == codigo.strip().upper()))
    if s is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Ese código no existe. Revísalo y prueba otra vez.")
    if s.estado != EstadoSolicitud.APROBADA:
        return AccesoOut(estado=s.estado, enlace=None)
    enlace = db.scalar(select(Curso.enlace).where(Curso.id == s.curso_id))
    if enlace and s.entregado_en is None:
        s.entregado_en = ahora()
        db.commit()
    return AccesoOut(estado=s.estado, enlace=enlace)


def listar(db: Session, estado: EstadoSolicitud | None) -> PanelSolicitudes:
    consulta = select(SolicitudCurso).order_by(SolicitudCurso.creado_en.desc()).limit(MAX_LISTADO)
    filas = db.scalars(consulta.where(SolicitudCurso.estado == estado) if estado else consulta).all()
    conteo = db.execute(select(SolicitudCurso.estado, func.count()).group_by(SolicitudCurso.estado)).all()
    por_estado = {estado: total for estado, total in conteo}
    entregadas = db.scalar(select(func.count()).where(SolicitudCurso.entregado_en.is_not(None))) or 0
    return PanelSolicitudes(
        solicitudes=[SolicitudPanel.model_validate(s, from_attributes=True) for s in filas],
        pendientes=por_estado.get(EstadoSolicitud.PENDIENTE, 0),
        aprobadas=por_estado.get(EstadoSolicitud.APROBADA, 0),
        rechazadas=por_estado.get(EstadoSolicitud.RECHAZADA, 0),
        entregadas=entregadas,
    )


def revisar(db: Session, solicitud_id: int, estado: EstadoSolicitud) -> SolicitudPanel:
    s = db.get(SolicitudCurso, solicitud_id)
    if s is None:
        raise ErrorNegocio(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada.")
    if estado == EstadoSolicitud.APROBADA and not db.scalar(select(Curso.enlace).where(Curso.id == s.curso_id)):
        raise ErrorNegocio(status.HTTP_400_BAD_REQUEST, "Ese curso no tiene enlace: agrégalo antes de aprobar.")
    s.estado = estado
    s.revisado_en = ahora()
    db.commit()
    return SolicitudPanel.model_validate(s, from_attributes=True)
