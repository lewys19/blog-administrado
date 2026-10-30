"""Importa todos los modelos para que SQLAlchemy y Alembic los registren."""

from app.models.comentario import Comentario, EstadoComentario
from app.models.contenido import Articulo, Categoria, EstadoArticulo, Etiqueta, articulo_etiqueta
from app.models.estadistica import Visita
from app.models.usuario import Rol, TokenRefresco, Usuario

__all__ = [
    "Articulo",
    "Categoria",
    "Comentario",
    "EstadoComentario",
    "EstadoArticulo",
    "Etiqueta",
    "Rol",
    "TokenRefresco",
    "Usuario",
    "Visita",
    "articulo_etiqueta",
]
