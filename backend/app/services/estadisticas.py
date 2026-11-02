"""Analítica del blog: registrar visitas (sin guardar IP ni usar cookies) y resumirlas para el panel."""

import hashlib
import re
import uuid
from datetime import date, datetime, time, timedelta
from functools import lru_cache
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

import maxminddb
import redis
from sqlalchemy import ColumnElement, Select, func, select
from sqlalchemy.orm import Session

from app.core.cache import cliente_redis
from app.core.config import settings
from app.core.fechas import ahora
from app.models import Articulo, Visita
from app.schemas.estadistica import (
    ArticuloVisto,
    Cuenta,
    EstadisticasOut,
    LecturaIn,
    Periodo,
    Punto,
    ResumenVisitas,
    Totales,
    VisitaIn,
    VisitaOut,
)
from app.services import articulos

# Robots, vistas previas de enlaces y herramientas: no son lectores.
ROBOTS = re.compile(
    r"bot|crawl|spider|slurp|scrap|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|"
    r"curl|wget|python|httpx|go-http|java/|okhttp|axios|node-fetch|monitor|uptime",
    re.IGNORECASE,
)

# De dónde llegó. Primero los dominios exactos (cortos y fáciles de confundir), luego palabras del dominio.
DOMINIOS = {
    "t.co": "redes", "x.com": "redes", "wa.me": "redes", "t.me": "redes", "lnkd.in": "redes",
    "news.ycombinator.com": "redes", "gemini.google.com": "ia", "copilot.microsoft.com": "ia",
    "claude.ai": "ia", "chatgpt.com": "ia", "perplexity.ai": "ia",
}  # fmt: skip
PALABRAS = {
    "ia": ("chatgpt", "openai", "perplexity", "claude", "gemini", "copilot"),
    "buscador": ("google", "bing", "duckduckgo", "yahoo", "yandex", "ecosia", "baidu", "search"),
    "redes": ("facebook", "fb", "instagram", "twitter", "linkedin", "reddit", "youtube", "tiktok",
              "whatsapp", "telegram", "threads", "pinterest", "mastodon"),
}  # fmt: skip


def _zona() -> ZoneInfo:
    return ZoneInfo(settings.ZONA_HORARIA)


# ---------- Registrar ----------


def _referente(valor: str | None) -> str | None:
    """Dominio de una URL (https://www.google.com/... → google.com) o el nombre de un utm_source."""
    if not valor or not valor.strip():
        return None
    valor = valor.strip().lower()
    host = urlsplit(valor).hostname if "://" in valor else valor
    if not host:
        return None
    return host.removeprefix("www.")[:120]


def _origen(referente: str | None) -> str:
    if referente is None:
        return "directo"
    if referente in DOMINIOS:
        return DOMINIOS[referente]
    partes = set(re.split(r"[.\-_ ]", referente))
    for origen, palabras in PALABRAS.items():
        if partes.intersection(palabras):
            return origen
    return "otros"


def _dispositivo(navegador: str) -> str:
    n = navegador.lower()
    if "ipad" in n or "tablet" in n or ("android" in n and "mobile" not in n):
        return "tablet"
    if "mobi" in n or "iphone" in n or "android" in n:
        return "movil"
    return "escritorio"


@lru_cache
def _base_paises() -> maxminddb.Reader | None:
    try:
        return maxminddb.open_database(settings.BASE_PAISES)
    except (OSError, maxminddb.InvalidDatabaseError):
        return None  # sin la base, el país sale del idioma del navegador


def _pais(cabecera: str | None, ip: str, idioma: str | None) -> str | None:
    if cabecera and len(cabecera) == 2 and cabecera.isalpha() and cabecera.upper() not in ("XX", "T1"):
        return cabecera.upper()
    base = _base_paises()
    if base is not None:
        try:
            dato = base.get(ip)
        except ValueError:  # "desconocida" u otra IP inválida
            dato = None
        codigo = dato.get("country", {}).get("iso_code") if isinstance(dato, dict) else None
        if isinstance(codigo, str):
            return codigo
    # Último recurso: "es-PE,es;q=0.9" → PE. Aproximado: dice el idioma del navegador, no dónde está.
    region = re.match(r"\s*[a-z]{2,3}-([a-z]{2})\b", idioma or "", re.IGNORECASE)
    return region.group(1).upper() if region else None


def _visitante(ip: str, navegador: str) -> str:
    """Cambia cada día: cuenta lectores únicos del día sin poder seguir a nadie de un día a otro."""
    dia = datetime.now(_zona()).date().isoformat()
    return hashlib.sha256(f"{settings.SECRET_KEY}|{dia}|{ip}|{navegador}".encode()).hexdigest()[:16]


def _demasiadas(ip: str) -> bool:
    try:
        clave = f"visitas:ip:{ip}:{int(ahora().timestamp() // 60)}"
        cliente = cliente_redis()
        cuenta = cliente.incr(clave)
        if cuenta == 1:
            cliente.expire(clave, 60)
        return int(cuenta) > settings.MAX_VISITAS_POR_MINUTO  # type: ignore[arg-type]
    except redis.RedisError:
        return False  # sin Redis se cuenta igual: mejor una visita de más que tumbar el blog


def registrar(
    db: Session,
    datos: VisitaIn,
    *,
    ip: str,
    navegador: str,
    pais_cabecera: str | None,
    idioma: str | None,
    es_prefetch: bool,
) -> VisitaOut:
    ruta = datos.ruta.split("?")[0].split("#")[0]
    if (
        es_prefetch
        or not navegador
        or ROBOTS.search(navegador)
        or not ruta.startswith("/")
        or ruta.startswith(("/admin", "/api"))
        or _demasiadas(ip)
    ):
        return VisitaOut(id=None)

    articulo_id = None
    prefijo = next((p for p in ("/blog/", "/guias/") if ruta.startswith(p)), None)
    if prefijo:
        slug = ruta.removeprefix(prefijo).strip("/").split("/")[0]
        articulo_id = db.scalar(select(Articulo.id).where(Articulo.slug == slug, articulos.visible()))

    referente = _referente(datos.referente)
    visita = Visita(
        id=uuid.uuid4(),
        ruta=ruta[:300],
        articulo_id=articulo_id,
        visitante=_visitante(ip, navegador),
        pais=_pais(pais_cabecera, ip, idioma),
        origen=_origen(referente),
        referente=referente,
        dispositivo=_dispositivo(navegador),
    )
    db.add(visita)
    db.commit()
    return VisitaOut(id=visita.id)


def lectura(db: Session, datos: LecturaIn) -> None:
    """La página informa cuánto rato estuvo a la vista y hasta dónde bajó. Solo puede subir, nunca bajar."""
    visita = db.get(Visita, datos.id)
    if visita is None:
        return
    transcurrido = (ahora() - visita.creado_en).total_seconds()
    if transcurrido > 6 * 3600:
        return
    # No puede haber leído más tiempo del que pasó desde que abrió la página.
    visita.segundos = max(visita.segundos, min(datos.segundos, int(transcurrido) + 5))
    visita.profundidad = max(visita.profundidad, datos.profundidad)
    db.commit()


# ---------- Resumir ----------


def _local(columna: ColumnElement[datetime], formato: str) -> ColumnElement[str]:
    return func.to_char(func.timezone(settings.ZONA_HORARIA, columna), formato)


def _lectores() -> ColumnElement[int]:
    """Únicos de cada día, sumados (el `visitante` cambia cada día)."""
    return func.count(func.distinct(func.concat(_local(Visita.creado_en, "YYYY-MM-DD"), Visita.visitante)))


def _promedio(columna: ColumnElement[int]) -> ColumnElement[float]:
    """Promedio en artículos, contando solo las visitas que informaron su lectura."""
    return func.coalesce(
        func.avg(columna).filter(Visita.articulo_id.is_not(None), Visita.segundos > 0), 0
    )


def _en(consulta: Select, desde: datetime, hasta: datetime) -> Select:
    return consulta.where(Visita.creado_en >= desde, Visita.creado_en < hasta)


def _inicio(dia: date) -> datetime:
    return datetime.combine(dia, time.min, _zona())


def _meses_atras(dia: date, n: int) -> date:
    total = dia.year * 12 + dia.month - 1 - n
    return date(total // 12, total % 12 + 1, 1)


def _serie(db: Session, desde: datetime, hasta: datetime, por_mes: bool, etiquetas: list[str]) -> list[Punto]:
    cubo = _local(Visita.creado_en, "YYYY-MM" if por_mes else "YYYY-MM-DD")
    filas = db.execute(_en(select(cubo, func.count(), _lectores()), desde, hasta).group_by(cubo)).all()
    datos = {etiqueta: (visitas, lectores) for etiqueta, visitas, lectores in filas}
    return [Punto(etiqueta=e, visitas=datos.get(e, (0, 0))[0], lectores=datos.get(e, (0, 0))[1]) for e in etiquetas]


def _conteo(db: Session, columna: ColumnElement, desde: datetime, hasta: datetime, limite: int) -> list[Cuenta]:
    consulta = _en(select(columna, func.count().label("n")), desde, hasta).group_by(columna)
    filas = db.execute(consulta.order_by(func.count().desc(), columna).limit(limite)).all()
    return [Cuenta(clave=clave, visitas=n) for clave, n in filas]


def _etiquetas_dias(desde: date, hasta: date) -> list[str]:
    return [(desde + timedelta(days=i)).isoformat() for i in range((hasta - desde).days + 1)]


def _etiquetas_meses(hasta: date, n: int) -> list[str]:
    return [_meses_atras(hasta, i).strftime("%Y-%m") for i in range(n - 1, -1, -1)]


def estadisticas(db: Session, periodo: Periodo) -> EstadisticasOut:
    hoy = datetime.now(_zona()).date()
    hasta = _inicio(hoy + timedelta(days=1))
    if periodo == "12m":
        primer_dia = _meses_atras(hoy, 11)
        desde, anterior = _inicio(primer_dia), _inicio(_meses_atras(hoy, 23))
        etiquetas = _etiquetas_meses(hoy, 12)
    else:
        dias = 7 if periodo == "7d" else 30
        primer_dia = hoy - timedelta(days=dias - 1)
        desde, anterior = _inicio(primer_dia), _inicio(primer_dia - timedelta(days=dias))
        etiquetas = _etiquetas_dias(primer_dia, hoy)

    visitas, lectores, segundos, profundidad = db.execute(
        _en(select(func.count(), _lectores(), _promedio(Visita.segundos), _promedio(Visita.profundidad)), desde, hasta)
    ).one()
    visitas_anterior = db.scalar(_en(select(func.count()).select_from(Visita), anterior, desde)) or 0

    vistos = db.execute(
        _en(
            select(
                Articulo.id,
                Articulo.titulo,
                Articulo.slug,
                func.count(),
                _promedio(Visita.segundos),
                _promedio(Visita.profundidad),
            ).join(Articulo, Articulo.id == Visita.articulo_id),
            desde,
            hasta,
        )
        .group_by(Articulo.id)
        .order_by(func.count().desc(), Articulo.id)
        .limit(10)
    ).all()

    return EstadisticasOut(
        periodo=periodo,
        desde=primer_dia,
        hasta=hoy,
        totales=Totales(
            visitas=visitas,
            visitas_anterior=visitas_anterior,
            lectores=lectores,
            segundos_promedio=round(segundos),
            profundidad_promedio=round(profundidad),
        ),
        serie=_serie(db, desde, hasta, periodo == "12m", etiquetas),
        paises=_conteo(db, Visita.pais, desde, hasta, 10),
        origenes=_conteo(db, Visita.origen, desde, hasta, 10),
        referentes=[c for c in _conteo(db, Visita.referente, desde, hasta, 11) if c.clave][:10],
        dispositivos=_conteo(db, Visita.dispositivo, desde, hasta, 5),
        articulos=[
            ArticuloVisto(
                id=i, titulo=t, slug=s, visitas=n, segundos_promedio=round(seg), profundidad_promedio=round(prof)
            )
            for i, t, s, n, seg, prof in vistos
        ],
    )


def resumen(db: Session) -> ResumenVisitas:
    momento = datetime.now(_zona())
    hoy = momento.date()
    inicio_hoy = _inicio(hoy)
    inicio_mes = _inicio(hoy.replace(day=1))
    inicio_mes_anterior = _inicio(_meses_atras(hoy, 1))
    # El mes pasado hasta el mismo punto (sin pasarse de su último día), para comparar parejo.
    corte_anterior = min(inicio_mes_anterior + (momento - inicio_mes), inicio_mes)
    hasta = _inicio(hoy + timedelta(days=1))

    hoy_visitas, hoy_lectores = db.execute(_en(select(func.count(), _lectores()), inicio_hoy, hasta)).one()
    mes, segundos = db.execute(_en(select(func.count(), _promedio(Visita.segundos)), inicio_mes, hasta)).one()
    return ResumenVisitas(
        hoy=hoy_visitas,
        lectores_hoy=hoy_lectores,
        mes=mes,
        mes_anterior=db.scalar(_en(select(func.count()).select_from(Visita), inicio_mes_anterior, corte_anterior))
        or 0,
        segundos_promedio_mes=round(segundos),
        por_mes=_serie(db, _inicio(_meses_atras(hoy, 11)), hasta, True, _etiquetas_meses(hoy, 12)),
    )


def paises_publicos(db: Session, limite: int = 5) -> list[Cuenta]:
    """Para la portada: de dónde vienen los lectores en los últimos 30 días (solo conteos, nada personal)."""
    hasta = ahora()
    desde = hasta - timedelta(days=30)
    filas = _conteo(db, Visita.pais, desde, hasta, 50)
    conocidos = [c for c in filas if c.clave]
    otros = sum(c.visitas for c in filas) - sum(c.visitas for c in conocidos[:limite])
    return conocidos[:limite] + ([Cuenta(clave=None, visitas=otros)] if otros else [])
