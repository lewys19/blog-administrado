"""Panel: artículos, categorías y etiquetas. Las reglas de quién publica están en services/articulos.py."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status

from app.almacen import Almacen, obtener_almacen
from app.api.deps import Db, EscribirArticulos, GestionarCategorias, MiembroPanel
from app.core.config import settings
from app.core.errores import ErrorNegocio
from app.models import EstadoArticulo
from app.schemas.contenido import (
    ArticuloEditor,
    ArticuloIn,
    CategoriaIn,
    CategoriaOut,
    EtiquetaIn,
    EtiquetaOut,
    PaginaArticulosPanel,
    VistaPreviaIn,
    VistaPreviaOut,
)
from app.services import articulos, markdown, taxonomia

router = APIRouter(prefix="/panel", tags=["Panel · Contenido"])
AlmacenDep = Annotated[Almacen, Depends(obtener_almacen)]


@router.get("/articulos", response_model=PaginaArticulosPanel)
def listar(
    quien: EscribirArticulos,
    db: Db,
    q: Annotated[str | None, Query(max_length=100)] = None,
    estado: EstadoArticulo | None = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginaArticulosPanel:
    """Quien no puede editar los de otros autores ve solo los suyos."""
    return articulos.listar_panel(db, quien, q, estado, pagina, por_pagina)


@router.post("/articulos", response_model=ArticuloEditor, status_code=status.HTTP_201_CREATED)
def crear(datos: ArticuloIn, quien: EscribirArticulos, db: Db, almacen: AlmacenDep) -> ArticuloEditor:
    return articulos.crear(db, almacen, quien, datos)


@router.post("/articulos/vista-previa", response_model=VistaPreviaOut)
def vista_previa(datos: VistaPreviaIn, _quien: EscribirArticulos) -> VistaPreviaOut:
    """El HTML que verá el lector, sin guardar nada."""
    return VistaPreviaOut(html=markdown.a_html(datos.contenido), minutos_lectura=markdown.minutos_lectura(datos.contenido))


@router.get("/articulos/{articulo_id}", response_model=ArticuloEditor)
def ver(articulo_id: int, quien: EscribirArticulos, db: Db, almacen: AlmacenDep) -> ArticuloEditor:
    return articulos.ver_panel(db, almacen, quien, articulo_id)


@router.put("/articulos/{articulo_id}", response_model=ArticuloEditor)
def editar(articulo_id: int, datos: ArticuloIn, quien: EscribirArticulos, db: Db, almacen: AlmacenDep) -> ArticuloEditor:
    return articulos.editar(db, almacen, quien, articulo_id, datos)


@router.delete("/articulos/{articulo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(articulo_id: int, quien: EscribirArticulos, db: Db, almacen: AlmacenDep) -> Response:
    articulos.eliminar(db, almacen, quien, articulo_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/articulos/{articulo_id}/imagen", response_model=ArticuloEditor)
async def subir_imagen(
    articulo_id: int, quien: EscribirArticulos, db: Db, almacen: AlmacenDep, foto: Annotated[UploadFile, File()]
) -> ArticuloEditor:
    """Portada: se recorta a 1200×630, la medida que usan las redes al compartir."""
    limite = settings.MAX_MB_FOTO * 1024 * 1024
    datos = await foto.read(limite + 1)
    if len(datos) > limite:
        raise ErrorNegocio(status.HTTP_413_CONTENT_TOO_LARGE, f"La imagen pesa más de {settings.MAX_MB_FOTO} MB.")
    return articulos.cambiar_imagen(db, almacen, quien, articulo_id, datos)


@router.delete("/articulos/{articulo_id}/imagen", response_model=ArticuloEditor)
def quitar_imagen(articulo_id: int, quien: EscribirArticulos, db: Db, almacen: AlmacenDep) -> ArticuloEditor:
    return articulos.cambiar_imagen(db, almacen, quien, articulo_id, None)


# ---------- Categorías ----------


@router.get("/categorias", response_model=list[CategoriaOut])
def listar_categorias(_quien: MiembroPanel, db: Db) -> list[CategoriaOut]:
    return taxonomia.listar_categorias(db)


@router.post("/categorias", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
def crear_categoria(datos: CategoriaIn, _quien: GestionarCategorias, db: Db) -> CategoriaOut:
    return taxonomia.crear_categoria(db, datos)


@router.put("/categorias/{categoria_id}", response_model=CategoriaOut)
def editar_categoria(categoria_id: int, datos: CategoriaIn, _quien: GestionarCategorias, db: Db) -> CategoriaOut:
    return taxonomia.editar_categoria(db, categoria_id, datos)


@router.delete("/categorias/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_categoria(categoria_id: int, _quien: GestionarCategorias, db: Db) -> Response:
    taxonomia.eliminar_categoria(db, categoria_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Etiquetas ----------


@router.get("/etiquetas", response_model=list[EtiquetaOut])
def listar_etiquetas(_quien: MiembroPanel, db: Db) -> list[EtiquetaOut]:
    """Las etiquetas se crean solas al escribirlas en un artículo; aquí se renombran o eliminan."""
    return taxonomia.listar_etiquetas(db)


@router.put("/etiquetas/{etiqueta_id}", response_model=EtiquetaOut)
def renombrar_etiqueta(etiqueta_id: int, datos: EtiquetaIn, _quien: GestionarCategorias, db: Db) -> EtiquetaOut:
    return taxonomia.renombrar_etiqueta(db, etiqueta_id, datos)


@router.delete("/etiquetas/{etiqueta_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_etiqueta(etiqueta_id: int, _quien: GestionarCategorias, db: Db) -> Response:
    taxonomia.eliminar_etiqueta(db, etiqueta_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
