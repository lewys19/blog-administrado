"""Importa todos los modelos para que SQLAlchemy y Alembic los registren."""

from app.models.comentario import Comentario, EstadoComentario
from app.models.contenido import Articulo, Categoria, EstadoArticulo, Etiqueta, TemaGuia, TipoArticulo, articulo_etiqueta
from app.models.estadistica import Visita
from app.models.newsletter import Envio, EstadoEnvio, EstadoSuscriptor, Suscriptor
from app.models.usuario import Rol, TokenRefresco, Usuario

__all__ = [
    "Articulo",
    "Categoria",
    "Comentario",
    "Envio",
    "EstadoComentario",
    "EstadoEnvio",
    "EstadoSuscriptor",
    "EstadoArticulo",
    "Etiqueta",
    "TemaGuia",
    "TipoArticulo",
    "Rol",
    "Suscriptor",
    "TokenRefresco",
    "Usuario",
    "Visita",
    "articulo_etiqueta",
]
