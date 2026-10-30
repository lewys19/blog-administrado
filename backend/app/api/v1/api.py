"""Router principal de la versión v1: une todos los endpoints."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, blog, comentarios, contenido, estadisticas, panel, yo

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(yo.router)
api_router.include_router(panel.router)
api_router.include_router(contenido.router)
api_router.include_router(blog.router)
api_router.include_router(estadisticas.router)
api_router.include_router(comentarios.router)
