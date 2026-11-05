"""Importa todos los modelos para que SQLAlchemy y Alembic los registren."""

from app.models.academia import (
    AnuncioAcademia,
    CategoriaAcademia,
    Curso,
    EtiquetaAcademia,
    GrupoEtiqueta,
    NivelCurso,
    PromocionAcademia,
    TipoRecurso,
)
from app.models.comentario import Comentario, EstadoComentario
from app.models.contenido import Articulo, Categoria, EstadoArticulo, Etiqueta, TemaGuia, TipoArticulo, articulo_etiqueta
from app.models.estadistica import Visita
from app.models.newsletter import Envio, EstadoEnvio, EstadoSuscriptor, Suscriptor
from app.models.usuario import Rol, TokenRefresco, Usuario

__all__ = [
    "AnuncioAcademia",
    "Articulo",
    "Categoria",
    "CategoriaAcademia",
    "Comentario",
    "Curso",
    "Envio",
    "EstadoComentario",
    "EstadoEnvio",
    "EstadoSuscriptor",
    "EstadoArticulo",
    "Etiqueta",
    "EtiquetaAcademia",
    "GrupoEtiqueta",
    "NivelCurso",
    "PromocionAcademia",
    "TemaGuia",
    "TipoArticulo",
    "TipoRecurso",
    "Rol",
    "Suscriptor",
    "TokenRefresco",
    "Usuario",
    "Visita",
    "articulo_etiqueta",
]
