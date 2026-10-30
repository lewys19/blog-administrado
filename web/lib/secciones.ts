// Secciones del panel (barra lateral). Las que llegan en sprints posteriores ya aparecen,
// con su sprint, para que el panel se vea completo desde el inicio y se sepa qué falta.

export interface Seccion {
  ruta: string; // después de /admin
  texto: string;
  grupo: "Contenido" | "Comunidad" | "Ingresos" | "Herramientas" | null;
  icono: string; // trazo SVG 24×24
  permiso?: string;
  /** Sprint en el que llega; sin número = ya funciona. */
  sprint?: number;
  descripcion: string;
}

export const SECCIONES: Seccion[] = [
  {
    ruta: "",
    texto: "Dashboard",
    grupo: null,
    icono: "M4 13h6V4H4zm0 7h6v-5H4zm10 0h6v-9h-6zm0-16v5h6V4z",
    descripcion: "Resumen del sitio.",
  },
  {
    ruta: "articulos",
    texto: "Artículos",
    grupo: "Contenido",
    icono: "M6 2h9l5 5v15H6zm8 1.5V8h4.5M9 12h8M9 16h8",
    permiso: "articulos.escribir",
    descripcion:
      "Escribir, revisar y publicar artículos: título, contenido, imagen, slug, categoría, etiquetas, estado y autor.",
  },
  {
    ruta: "categorias",
    texto: "Categorías",
    grupo: "Contenido",
    icono: "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z",
    permiso: "categorias.gestionar",
    descripcion: "Árbol de categorías: Programación › Python › FastAPI, SQL, QA, IA.",
  },
  {
    ruta: "etiquetas",
    texto: "Etiquetas",
    grupo: "Contenido",
    icono: "M3 12V4h8l10 10-8 8zm4-6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
    permiso: "categorias.gestionar",
    descripcion: "Etiquetas libres para agrupar artículos (#docker, #postgresql).",
  },
  {
    ruta: "seo",
    texto: "SEO",
    grupo: "Contenido",
    icono: "M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z",
    permiso: "seo.gestionar",
    descripcion: "Meta title, description, palabras clave, URL amigable, OpenGraph y Schema.org; sitemap y RSS.",
  },
  {
    ruta: "comentarios",
    texto: "Comentarios",
    grupo: "Comunidad",
    icono: "M4 4h16v12H8l-4 4z",
    permiso: "comentarios.moderar",
    descripcion: "Aprobar, ocultar, borrar y marcar como spam lo que escriben los lectores.",
  },
  {
    ruta: "usuarios",
    texto: "Usuarios",
    grupo: "Comunidad",
    icono:
      "M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM8 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm8 1c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4z",
    permiso: "usuarios.ver",
    descripcion: "Lectores, suscriptores y autores.",
  },
  {
    ruta: "autores",
    texto: "Autores y roles",
    grupo: "Comunidad",
    icono: "M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5zm-1 14-4-4 1.4-1.4 2.6 2.6 5.6-5.6L18 9z",
    permiso: "roles.gestionar",
    descripcion: "Roles (Administrador, Editor, Redactor, Invitado) y sus permisos.",
  },
  {
    ruta: "publicidad",
    texto: "Publicidad",
    grupo: "Ingresos",
    icono: "M3 10v4a1 1 0 0 0 1 1h2l4 4V5L6 9H4a1 1 0 0 0-1 1zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z",
    permiso: "publicidad.gestionar",
    sprint: 6,
    descripcion: "Google AdSense, banners (superior, lateral, dentro del artículo) y patrocinios.",
  },
  {
    ruta: "afiliados",
    texto: "Afiliados",
    grupo: "Ingresos",
    icono: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1m1 5a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
    permiso: "publicidad.gestionar",
    sprint: 6,
    descripcion: "Amazon Afiliados y otros: productos, enlaces y clics.",
  },
  {
    ruta: "apoyos",
    texto: "Apoyos",
    grupo: "Ingresos",
    icono: "M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zm13 1h1.5a2.5 2.5 0 0 1 0 5H17",
    permiso: "ingresos.ver",
    sprint: 7,
    descripcion: "Cafecito, colaboraciones y página de patrocinio.",
  },
  {
    ruta: "tienda",
    texto: "Tienda",
    grupo: "Ingresos",
    icono: "M5 7h14l-1 13H6zm4 0a3 3 0 0 1 6 0",
    permiso: "ingresos.ver",
    sprint: 8,
    descripcion: "Materiales (PDF y videos), cursos y certificados verificables.",
  },
  {
    ruta: "newsletter",
    texto: "Newsletter",
    grupo: "Herramientas",
    icono: "M3 5h18v14H3zm0 0 9 7 9-7",
    permiso: "newsletter.gestionar",
    descripcion: "Suscriptores con confirmación por correo y envío de cada artículo nuevo.",
  },
  {
    ruta: "estadisticas",
    texto: "Estadísticas",
    grupo: "Herramientas",
    icono: "M4 20V10m6 10V4m6 16v-7m4 7H2",
    permiso: "estadisticas.ver",
    descripcion: "Visitas, países, tiempo de lectura, artículos más vistos y CTR de anuncios.",
  },
  {
    ruta: "ia",
    texto: "IA",
    grupo: "Herramientas",
    icono: "M12 2l2.4 6.3L21 9l-5 4.5L17.5 21 12 17.3 6.5 21 8 13.5 3 9l6.6-.7z",
    permiso: "ia.usar",
    sprint: 5,
    descripcion: "Generar artículo, resumen, SEO, imágenes y sugerencias de temas.",
  },
  {
    ruta: "configuracion",
    texto: "Configuración",
    grupo: "Herramientas",
    icono:
      "M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z",
    permiso: "configuracion.gestionar",
    sprint: 10,
    descripcion: "Logo, menús, redes sociales, dominio, seguridad, copias de seguridad y correo SMTP.",
  },
];
