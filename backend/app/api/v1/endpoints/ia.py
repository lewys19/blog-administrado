"""Panel: herramientas de IA. Solo quien tiene el permiso «ia.usar» (el Administrador siempre)."""

from fastapi import APIRouter
from starlette.concurrency import run_in_threadpool

from app.api.deps import UsarIA
from app.schemas.ia import BorradorIn, BorradorOut
from app.services import ia

router = APIRouter(prefix="/panel/ia", tags=["Panel · IA"])


@router.post("/borrador", response_model=BorradorOut)
async def borrador(datos: BorradorIn, _quien: UsarIA) -> BorradorOut:
    # La llamada a Claude tarda (hasta un par de minutos): va en un hilo para no frenar el resto de la API.
    resultado = await run_in_threadpool(ia.generar_borrador, datos.tema, datos.indicaciones, datos.palabras)
    return BorradorOut(**resultado)
