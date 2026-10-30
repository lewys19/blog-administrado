"""Analítica: el blog informa cada visita y su lectura; el panel ve el resumen."""

from typing import Annotated

from fastapi import APIRouter, Header, Query, Response, status

from app.api.deps import Db, Ip, VerEstadisticas
from app.core.config import settings
from app.schemas.estadistica import EstadisticasOut, LecturaIn, Periodo, VisitaIn, VisitaOut
from app.services import estadisticas

router = APIRouter(tags=["Estadísticas"])


@router.post("/estadisticas/visita", response_model=VisitaOut)
def registrar_visita(
    datos: VisitaIn,
    db: Db,
    ip: Ip,
    user_agent: Annotated[str, Header()] = "",
    accept_language: Annotated[str | None, Header()] = None,
    sec_purpose: Annotated[str | None, Header()] = None,
    purpose: Annotated[str | None, Header()] = None,
    x_pais: Annotated[str | None, Header(alias=settings.CABECERA_PAIS)] = None,
) -> VisitaOut:
    """Sin cookies ni IP guardada. Robots, prefetch y ráfagas devuelven id null y no cuentan."""
    return estadisticas.registrar(
        db,
        datos,
        ip=ip,
        navegador=user_agent,
        pais_cabecera=x_pais,
        idioma=accept_language,
        es_prefetch="prefetch" in f"{sec_purpose or ''}{purpose or ''}",
    )


@router.post("/estadisticas/lectura", status_code=status.HTTP_204_NO_CONTENT)
def registrar_lectura(datos: LecturaIn, db: Db) -> Response:
    """Tiempo con la página a la vista y % que bajó. Lo manda el navegador al salir (sendBeacon)."""
    estadisticas.lectura(db, datos)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/panel/estadisticas", response_model=EstadisticasOut)
def ver_estadisticas(_quien: VerEstadisticas, db: Db, periodo: Annotated[Periodo, Query()] = "30d") -> EstadisticasOut:
    return estadisticas.estadisticas(db, periodo)
