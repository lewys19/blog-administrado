"""Academia Digital: lo público (sin sesión, solo cursos publicados) y su gestión en el panel."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status

from app.almacen import Almacen, obtener_almacen
from app.api.deps import Db, GestionarAcademia
from app.core.config import settings
from app.core.errores import ErrorNegocio
from app.models import TipoRecurso
from app.schemas.academia import (
    AnuncioIn,
    AnuncioOut,
    CategoriaAcademiaIn,
    CategoriaAcademiaOut,
    CursoIn,
    CursoPanel,
    CursoPublico,
    EtiquetaAcademiaIn,
    EtiquetaAcademiaOut,
    Lateral,
    PaginaCursos,
)
from app.services import academia

router = APIRouter(prefix="/academia", tags=["Academia"])
panel = APIRouter(prefix="/panel/academia", tags=["Panel · Academia"])
AlmacenDep = Annotated[Almacen, Depends(obtener_almacen)]


@router.get("/categorias", response_model=list[CategoriaAcademiaOut])
def categorias(db: Db) -> list[CategoriaAcademiaOut]:
    return academia.listar_categorias(db)


@router.get("/cursos", response_model=PaginaCursos)
def cursos(
    db: Db,
    almacen: AlmacenDep,
    categoria: Annotated[str | None, Query(max_length=80)] = None,
    destacados: bool = False,
    q: Annotated[str | None, Query(max_length=100)] = None,
    tipo: TipoRecurso | None = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 12,
) -> PaginaCursos:
    return academia.listar_publicos(db, almacen, categoria, destacados, q, tipo, pagina, por_pagina)


@router.get("/lateral", response_model=Lateral)
def lateral(db: Db, almacen: AlmacenDep) -> Lateral:
    return academia.lateral(db, almacen)


@router.get("/cursos/{slug}", response_model=CursoPublico)
def curso(slug: str, db: Db, almacen: AlmacenDep) -> CursoPublico:
    return academia.ver_publico(db, almacen, slug)


@panel.post("/categorias", response_model=CategoriaAcademiaOut, status_code=status.HTTP_201_CREATED)
def crear_categoria(datos: CategoriaAcademiaIn, _quien: GestionarAcademia, db: Db) -> CategoriaAcademiaOut:
    return academia.crear_categoria(db, datos)


@panel.put("/categorias/{categoria_id}", response_model=CategoriaAcademiaOut)
def editar_categoria(
    categoria_id: int, datos: CategoriaAcademiaIn, _quien: GestionarAcademia, db: Db
) -> CategoriaAcademiaOut:
    return academia.editar_categoria(db, categoria_id, datos)


@panel.delete("/categorias/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_categoria(categoria_id: int, _quien: GestionarAcademia, db: Db) -> Response:
    academia.eliminar_categoria(db, categoria_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@panel.get("/cursos", response_model=list[CursoPanel])
def listar_cursos(
    _quien: GestionarAcademia, db: Db, almacen: AlmacenDep, tipo: TipoRecurso | None = None
) -> list[CursoPanel]:
    return academia.listar_panel(db, almacen, tipo)


@panel.post("/cursos", response_model=CursoPanel, status_code=status.HTTP_201_CREATED)
def crear_curso(datos: CursoIn, _quien: GestionarAcademia, db: Db, almacen: AlmacenDep) -> CursoPanel:
    return academia.crear_curso(db, almacen, datos)


@panel.put("/cursos/{curso_id}", response_model=CursoPanel)
def editar_curso(curso_id: int, datos: CursoIn, _quien: GestionarAcademia, db: Db, almacen: AlmacenDep) -> CursoPanel:
    return academia.editar_curso(db, almacen, curso_id, datos)


@panel.delete("/cursos/{curso_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_curso(curso_id: int, _quien: GestionarAcademia, db: Db, almacen: AlmacenDep) -> Response:
    academia.eliminar_curso(db, almacen, curso_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@panel.put("/cursos/{curso_id}/portada", response_model=CursoPanel)
async def subir_portada(
    curso_id: int, _quien: GestionarAcademia, db: Db, almacen: AlmacenDep, foto: Annotated[UploadFile, File()]
) -> CursoPanel:
    limite = settings.MAX_MB_FOTO * 1024 * 1024
    datos = await foto.read(limite + 1)
    if len(datos) > limite:
        raise ErrorNegocio(status.HTTP_413_CONTENT_TOO_LARGE, f"La imagen pesa más de {settings.MAX_MB_FOTO} MB.")
    return academia.cambiar_portada(db, almacen, curso_id, datos)


@panel.delete("/cursos/{curso_id}/portada", response_model=CursoPanel)
def quitar_portada(curso_id: int, _quien: GestionarAcademia, db: Db, almacen: AlmacenDep) -> CursoPanel:
    return academia.cambiar_portada(db, almacen, curso_id, None)


@panel.get("/etiquetas", response_model=list[EtiquetaAcademiaOut])
def listar_etiquetas(_quien: GestionarAcademia, db: Db) -> list[EtiquetaAcademiaOut]:
    return academia.listar_etiquetas(db)


@panel.post("/etiquetas", response_model=EtiquetaAcademiaOut, status_code=status.HTTP_201_CREATED)
def crear_etiqueta(datos: EtiquetaAcademiaIn, _quien: GestionarAcademia, db: Db) -> EtiquetaAcademiaOut:
    return academia.guardar_etiqueta(db, datos)


@panel.put("/etiquetas/{etiqueta_id}", response_model=EtiquetaAcademiaOut)
def editar_etiqueta(etiqueta_id: int, datos: EtiquetaAcademiaIn, _quien: GestionarAcademia, db: Db) -> EtiquetaAcademiaOut:
    return academia.guardar_etiqueta(db, datos, etiqueta_id)


@panel.delete("/etiquetas/{etiqueta_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_etiqueta(etiqueta_id: int, _quien: GestionarAcademia, db: Db) -> Response:
    academia.eliminar_etiqueta(db, etiqueta_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@panel.get("/anuncios", response_model=list[AnuncioOut])
def listar_anuncios(_quien: GestionarAcademia, db: Db, almacen: AlmacenDep) -> list[AnuncioOut]:
    return academia.listar_anuncios(db, almacen)


@panel.post("/anuncios", response_model=AnuncioOut, status_code=status.HTTP_201_CREATED)
def crear_anuncio(datos: AnuncioIn, _quien: GestionarAcademia, db: Db, almacen: AlmacenDep) -> AnuncioOut:
    return academia.guardar_anuncio(db, almacen, datos)


@panel.put("/anuncios/{anuncio_id}", response_model=AnuncioOut)
def editar_anuncio(anuncio_id: int, datos: AnuncioIn, _quien: GestionarAcademia, db: Db, almacen: AlmacenDep) -> AnuncioOut:
    return academia.guardar_anuncio(db, almacen, datos, anuncio_id)


@panel.delete("/anuncios/{anuncio_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_anuncio(anuncio_id: int, _quien: GestionarAcademia, db: Db, almacen: AlmacenDep) -> Response:
    academia.eliminar_anuncio(db, almacen, anuncio_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@panel.put("/anuncios/{anuncio_id}/imagen", response_model=AnuncioOut)
async def subir_imagen_anuncio(
    anuncio_id: int, _quien: GestionarAcademia, db: Db, almacen: AlmacenDep, foto: Annotated[UploadFile, File()]
) -> AnuncioOut:
    limite = settings.MAX_MB_FOTO * 1024 * 1024
    datos = await foto.read(limite + 1)
    if len(datos) > limite:
        raise ErrorNegocio(status.HTTP_413_CONTENT_TOO_LARGE, f"La imagen pesa más de {settings.MAX_MB_FOTO} MB.")
    return academia.cambiar_imagen_anuncio(db, almacen, anuncio_id, datos)
