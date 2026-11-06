"""Panel: fuentes RSS y bandeja de noticias. Nada de esto se publica solo: acaba en un borrador."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.almacen import Almacen, obtener_almacen
from app.api.deps import Db, GestionarFuentes
from app.models import EstadoNoticia
from app.schemas.fuentes import (
    AvisoFuentes,
    BorradorCreado,
    FuenteIn,
    FuenteOut,
    LoteIn,
    PaginaNoticias,
    ResultadoLectura,
    ResultadoLote,
)
from app.services import fuentes

router = APIRouter(prefix="/panel", tags=["Panel · Fuentes"])
AlmacenDep = Annotated[Almacen, Depends(obtener_almacen)]


@router.get("/fuentes", response_model=list[FuenteOut])
def listar(_quien: GestionarFuentes, db: Db) -> list[FuenteOut]:
    return fuentes.listar(db)


@router.get("/fuentes/aviso", response_model=AvisoFuentes)
def aviso(_quien: GestionarFuentes, db: Db) -> AvisoFuentes:
    return fuentes.aviso(db)


@router.post("/fuentes", response_model=FuenteOut, status_code=status.HTTP_201_CREATED)
def crear(datos: FuenteIn, _quien: GestionarFuentes, db: Db) -> FuenteOut:
    return fuentes.guardar(db, datos)


@router.post("/fuentes/actualizar", response_model=ResultadoLectura)
def actualizar(_quien: GestionarFuentes, db: Db) -> ResultadoLectura:
    return fuentes.actualizar(db)


@router.put("/fuentes/{fuente_id}", response_model=FuenteOut)
def editar(fuente_id: int, datos: FuenteIn, _quien: GestionarFuentes, db: Db) -> FuenteOut:
    return fuentes.guardar(db, datos, fuente_id)


@router.delete("/fuentes/{fuente_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(fuente_id: int, _quien: GestionarFuentes, db: Db) -> Response:
    fuentes.eliminar(db, fuente_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/noticias", response_model=PaginaNoticias)
def bandeja(
    _quien: GestionarFuentes,
    db: Db,
    estado: EstadoNoticia = EstadoNoticia.NUEVA,
    fuente_id: int | None = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginaNoticias:
    return fuentes.bandeja(db, estado, fuente_id, pagina, por_pagina)


@router.post("/noticias/lote", response_model=ResultadoLote)
def lote(datos: LoteIn, quien: GestionarFuentes, db: Db, almacen: AlmacenDep) -> ResultadoLote:
    return fuentes.procesar_lote(db, almacen, quien, datos.ids, datos.accion)


@router.post("/noticias/{noticia_id}/borrador", response_model=BorradorCreado, status_code=status.HTTP_201_CREATED)
def borrador(noticia_id: int, quien: GestionarFuentes, db: Db, almacen: AlmacenDep) -> BorradorCreado:
    return fuentes.crear_borrador(db, almacen, quien, noticia_id)


@router.post("/noticias/{noticia_id}/descartar", status_code=status.HTTP_204_NO_CONTENT)
def descartar(noticia_id: int, _quien: GestionarFuentes, db: Db) -> Response:
    fuentes.cambiar_estado(db, noticia_id, EstadoNoticia.DESCARTADA)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
