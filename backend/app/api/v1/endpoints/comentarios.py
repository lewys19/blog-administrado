"""Comentarios: el blog los muestra y recibe; el panel los modera."""

from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import Db, Ip, ModerarComentarios
from app.schemas.comentario import (
    ComentarioEnviado,
    ComentarioIn,
    ComentarioPublico,
    Estado,
    ModerarIn,
    PaginaComentarios,
)
from app.services import comentarios

router = APIRouter(tags=["Comentarios"])


@router.get("/blog/articulos/{slug}/comentarios", response_model=list[ComentarioPublico])
def ver(slug: str, db: Db) -> list[ComentarioPublico]:
    """Solo los aprobados, del más antiguo al más nuevo (se leen como una conversación)."""
    return comentarios.publicos(db, slug)


@router.post("/blog/articulos/{slug}/comentarios", response_model=ComentarioEnviado, status_code=status.HTTP_201_CREATED)
def comentar(slug: str, datos: ComentarioIn, db: Db, ip: Ip) -> ComentarioEnviado:
    """Sin cuenta. Queda pendiente salvo que ese correo ya tenga un comentario aprobado."""
    return comentarios.crear(db, slug, datos, ip)


@router.get("/panel/comentarios", response_model=PaginaComentarios)
def listar(
    _quien: ModerarComentarios,
    db: Db,
    estado: Annotated[Estado, Query()] = "pendiente",
    q: Annotated[str | None, Query(max_length=100)] = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginaComentarios:
    return comentarios.listar(db, estado, q, pagina, por_pagina)


@router.patch("/panel/comentarios/{id_}", status_code=status.HTTP_204_NO_CONTENT)
def moderar(id_: int, datos: ModerarIn, _quien: ModerarComentarios, db: Db) -> Response:
    comentarios.moderar(db, id_, datos.estado)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/panel/comentarios/{id_}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(id_: int, _quien: ModerarComentarios, db: Db) -> Response:
    comentarios.eliminar(db, id_)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
