"""Boletín: el blog suscribe, confirma y da de baja; el panel ve suscriptores y envía artículos."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Response, status
from sqlalchemy.orm import sessionmaker

from app.almacen import Almacen, obtener_almacen
from app.api.deps import Db, GestionarNewsletter, Ip
from app.schemas.newsletter import (
    ArticuloParaEnviar,
    Aviso,
    EnviarIn,
    EnvioOut,
    EstadoSuscriptor,
    PaginaSuscriptores,
    SuscribirIn,
    TokenIn,
)
from app.services import newsletter

router = APIRouter(tags=["Newsletter"])
AlmacenDep = Annotated[Almacen, Depends(obtener_almacen)]


@router.post("/newsletter/suscribir", response_model=Aviso)
def suscribir(datos: SuscribirIn, db: Db, ip: Ip) -> Aviso:
    """Manda el correo de confirmación. Responde lo mismo esté o no suscrito ese correo."""
    return Aviso(mensaje=newsletter.suscribir(db, datos.correo, datos.sitio_web, ip))


@router.post("/newsletter/confirmar", response_model=Aviso)
def confirmar(datos: TokenIn, db: Db) -> Aviso:
    return Aviso(mensaje=newsletter.confirmar(db, datos.token))


@router.post("/newsletter/baja", response_model=Aviso)
def baja(datos: TokenIn, db: Db) -> Aviso:
    return Aviso(mensaje=newsletter.baja(db, datos.token))


@router.post("/newsletter/baja/{token}", response_model=Aviso, include_in_schema=False)
def baja_un_clic(token: str, db: Db) -> Aviso:
    """El botón «Cancelar suscripción» de Gmail y otros (List-Unsubscribe-Post)."""
    return Aviso(mensaje=newsletter.baja(db, token))


@router.get("/panel/newsletter/suscriptores", response_model=PaginaSuscriptores)
def suscriptores(
    _quien: GestionarNewsletter,
    db: Db,
    estado: Annotated[EstadoSuscriptor, Query()] = "confirmado",
    q: Annotated[str | None, Query(max_length=100)] = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginaSuscriptores:
    return newsletter.listar(db, estado, q, pagina, por_pagina)


@router.get("/panel/newsletter/suscriptores.csv")
def exportar(_quien: GestionarNewsletter, db: Db) -> Response:
    return Response(
        newsletter.csv_confirmados(db),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="suscriptores.csv"'},
    )


@router.delete("/panel/newsletter/suscriptores/{id_}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(id_: int, _quien: GestionarNewsletter, db: Db) -> Response:
    newsletter.eliminar(db, id_)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/panel/newsletter/articulos", response_model=list[ArticuloParaEnviar])
def articulos(_quien: GestionarNewsletter, db: Db) -> list[ArticuloParaEnviar]:
    return newsletter.para_enviar(db)


@router.post("/panel/newsletter/prueba", response_model=Aviso)
def prueba(datos: EnviarIn, quien: GestionarNewsletter, db: Db, almacen: AlmacenDep) -> Aviso:
    return Aviso(mensaje=newsletter.prueba(db, almacen, datos.articulo_id, quien))


@router.post("/panel/newsletter/envios", response_model=EnvioOut, status_code=status.HTTP_202_ACCEPTED)
def enviar(
    datos: EnviarIn, quien: GestionarNewsletter, db: Db, almacen: AlmacenDep, tareas: BackgroundTasks
) -> EnvioOut:
    """Responde enseguida; los correos salen en segundo plano (el panel consulta el avance)."""
    envio = newsletter.iniciar_envio(db, datos.articulo_id, quien)
    fabrica = sessionmaker(bind=db.get_bind(), autoflush=False, autocommit=False)
    tareas.add_task(newsletter.repartir, fabrica, almacen, envio.id)
    return newsletter.envios(db)[0]


@router.get("/panel/newsletter/envios", response_model=list[EnvioOut])
def envios(_quien: GestionarNewsletter, db: Db) -> list[EnvioOut]:
    return newsletter.envios(db)
