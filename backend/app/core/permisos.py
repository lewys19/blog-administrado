"""Permisos del panel. La lista es fija (la define el código); los roles se crean desde el panel
y eligen cuáles de estos permisos tienen. El rol Administrador los tiene todos y no se puede cambiar.

Varias secciones llegan en sprints posteriores: sus permisos ya existen para que los roles
queden armados desde el principio.
"""

PERMISOS: dict[str, str] = {
    # Contenido
    "articulos.escribir": "Escribir artículos (borradores)",
    "guias.escribir": "Escribir y publicar sus propias guías",
    "articulos.publicar": "Publicar artículos",
    "articulos.editar_todos": "Editar artículos de otros autores",
    "categorias.gestionar": "Crear y ordenar categorías y etiquetas",
    "seo.gestionar": "Editar el SEO del sitio y de los artículos",
    # Comunidad
    "comentarios.moderar": "Aprobar, borrar y marcar comentarios como spam",
    "usuarios.ver": "Ver usuarios",
    "usuarios.editar": "Editar y bloquear usuarios",
    "roles.gestionar": "Crear roles y asignarlos",
    # Ingresos
    "publicidad.gestionar": "Banners, AdSense, afiliados y patrocinios",
    "academia.gestionar": "Crear categorías y cursos de la Academia Digital",
    "ingresos.ver": "Ver ingresos y ventas",
    "newsletter.gestionar": "Enviar el boletín y ver suscriptores",
    # Herramientas
    "estadisticas.ver": "Ver estadísticas de visitas",
    "ia.usar": "Usar las herramientas de IA",
    "configuracion.gestionar": "Cambiar la configuración del sitio",
}

ADMINISTRADOR = 1  # id del rol Administrador (lo crea la migración 0001)
COLABORADOR = "Colaborador"  # rol que recibe quien se registra (migración 0008): escribe guías
