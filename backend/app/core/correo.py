"""Envío de correos por SMTP.

Sin SMTP_HOST (desarrollo y pruebas) los correos no salen: se guardan como archivos .eml en
CARPETA_BUZON, que se abren con cualquier programa de correo.
"""

import logging
import smtplib
import ssl
import time
import uuid
from collections.abc import Iterable
from dataclasses import dataclass, field
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from pathlib import Path

from app.core.config import settings

log = logging.getLogger(__name__)


@dataclass
class Correo:
    para: str
    asunto: str
    texto: str
    html: str
    cabeceras: dict[str, str] = field(default_factory=dict)

    def mensaje(self) -> EmailMessage:
        m = EmailMessage()
        m["From"] = settings.CORREO_REMITENTE
        m["To"] = self.para
        m["Subject"] = self.asunto
        m["Date"] = formatdate(localtime=True)
        m["Message-ID"] = make_msgid(domain=settings.CORREO_REMITENTE.rsplit("@", 1)[-1].strip("> "))
        for clave, valor in self.cabeceras.items():
            m[clave] = valor
        m.set_content(self.texto)
        m.add_alternative(self.html, subtype="html")
        return m


def _conectar() -> smtplib.SMTP:
    contexto = ssl.create_default_context()
    if settings.SMTP_SEGURIDAD == "ssl":
        servidor: smtplib.SMTP = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PUERTO, context=contexto, timeout=30)
    else:
        servidor = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PUERTO, timeout=30)
        if settings.SMTP_SEGURIDAD == "starttls":
            servidor.starttls(context=contexto)
    if settings.SMTP_USUARIO:
        servidor.login(settings.SMTP_USUARIO, settings.SMTP_CLAVE)
    return servidor


def enviar_varios(correos: Iterable[Correo]) -> tuple[int, int]:
    """Envía usando una sola conexión. Devuelve (enviados, fallidos); un fallo no detiene a los demás."""
    enviados = fallidos = 0
    if not settings.SMTP_HOST:
        carpeta = Path(settings.CARPETA_BUZON)
        carpeta.mkdir(parents=True, exist_ok=True)
        for c in correos:
            nombre = f"{time.time_ns()}-{uuid.uuid4().hex[:8]}.eml"  # en orden de llegada
            (carpeta / nombre).write_bytes(c.mensaje().as_bytes())
            enviados += 1
        return enviados, fallidos
    with _conectar() as servidor:
        for c in correos:
            try:
                servidor.send_message(c.mensaje())
                enviados += 1
            except smtplib.SMTPException:
                log.exception("No se pudo enviar a %s", c.para)
                fallidos += 1
    return enviados, fallidos


def enviar(correo: Correo) -> bool:
    try:
        return enviar_varios([correo])[0] == 1
    except (OSError, smtplib.SMTPException):
        log.exception("Falló el servidor de correo")
        return False
