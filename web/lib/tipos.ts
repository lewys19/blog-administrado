// Tipos de lo que devuelve la API.

/** Cuenta propia (GET /yo). */
export interface Yo {
  id: number;
  email: string;
  username: string;
  nombre: string;
  en_panel: boolean;
  biografia: string | null;
  creado_en: string;
  /** «Administrador», «Editor»… o null (lector). */
  rol: string | null;
  permisos: string[];
}

export interface Resumen {
  usuarios: number;
  usuarios_nuevos_7d: number;
  usuarios_activos_hoy: number;
  equipo: number;
  articulos_publicados: number;
  articulos_en_revision: number;
  /** null: tu rol no ve estadísticas. */
  visitas: ResumenVisitas | null;
  comentarios_pendientes: number | null;
}

// ---------- Estadísticas ----------

export type Periodo = "7d" | "30d" | "12m";

export interface Punto {
  etiqueta: string; // "2026-10-29" o "2026-10"
  visitas: number;
  lectores: number;
}

export interface Cuenta {
  clave: string | null;
  visitas: number;
}

export interface ResumenVisitas {
  hoy: number;
  lectores_hoy: number;
  mes: number;
  mes_anterior: number;
  segundos_promedio_mes: number;
  por_mes: Punto[];
}

export interface Estadisticas {
  periodo: Periodo;
  desde: string;
  hasta: string;
  totales: {
    visitas: number;
    visitas_anterior: number;
    lectores: number;
    segundos_promedio: number;
    profundidad_promedio: number;
  };
  serie: Punto[];
  paises: Cuenta[];
  origenes: Cuenta[];
  referentes: Cuenta[];
  dispositivos: Cuenta[];
  articulos: {
    id: number;
    titulo: string;
    slug: string;
    visitas: number;
    segundos_promedio: number;
    profundidad_promedio: number;
  }[];
}

export interface UsuarioFila {
  id: number;
  email: string;
  username: string;
  nombre: string;
  rol: { id: number; nombre: string } | null;
  bloqueado: boolean;
  creado_en: string;
  ultimo_ingreso_en: string | null;
}

export interface PaginaUsuarios {
  total: number;
  pagina: number;
  por_pagina: number;
  usuarios: UsuarioFila[];
}

export interface Permiso {
  clave: string;
  texto: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  permisos: string[];
  usuarios: number;
  /** El Administrador no se edita ni se borra. */
  fijo: boolean;
}

// ---------- Contenido ----------

export type EstadoArticulo = "borrador" | "revision" | "programado" | "publicado";

export interface Corto {
  nombre: string;
  slug: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  padre_id: number | null;
  orden: number;
  /** Publicados. */
  articulos: number;
}

export interface Etiqueta {
  id: number;
  nombre: string;
  slug: string;
  articulos: number;
}

export type TipoArticulo = "noticia" | "guia";

export interface ArticuloFila {
  id: number;
  titulo: string;
  slug: string;
  tipo: TipoArticulo;
  tema: { nombre: string; slug: string } | null; // solo guías
  estado: EstadoArticulo;
  destacado: boolean;
  categoria: Corto | null;
  autor: { id: number; nombre: string; username: string };
  publicado_en: string | null;
  actualizado_en: string;
  seo_completo: boolean;
}

export interface PaginaArticulosPanel {
  total: number;
  pagina: number;
  por_pagina: number;
  articulos: ArticuloFila[];
}

export interface ArticuloEditor extends ArticuloFila {
  resumen: string | null;
  contenido: string;
  imagen: string | null;
  categoria_id: number | null;
  etiquetas: string[];
  minutos_lectura: number;
  meta_titulo: string | null;
  meta_descripcion: string | null;
  palabras_clave: string | null;
}

export interface ArticuloTarjeta {
  titulo: string;
  slug: string;
  tipo: TipoArticulo;
  tema: { nombre: string; slug: string } | null; // solo guías
  resumen: string | null;
  imagen: string | null;
  categoria: Corto | null;
  autor: { nombre: string; username: string };
  publicado_en: string;
  minutos_lectura: number;
  destacado: boolean;
}

export interface PaginaArticulos {
  total: number;
  pagina: number;
  por_pagina: number;
  articulos: ArticuloTarjeta[];
}

export interface AutorFicha {
  nombre: string;
  username: string;
  biografia: string | null;
  articulos: number;
}

export interface MasLeido {
  titulo: string;
  slug: string;
  tipo: TipoArticulo;
  tema: { nombre: string; slug: string } | null; // solo guías
  imagen: string | null;
  vistas: number;
}

export interface ArticuloPublico extends ArticuloTarjeta {
  vistas: number;
  comentarios: number;
  sobre_autor: AutorFicha;
  contenido_html: string;
  etiquetas: Corto[];
  actualizado_en: string;
  meta_titulo: string;
  meta_descripcion: string;
  palabras_clave: string | null;
  relacionados: ArticuloTarjeta[];
}

export interface Autor {
  nombre: string;
  username: string;
  biografia: string | null;
  articulos: ArticuloTarjeta[];
}

// ---------- Comentarios ----------

export type EstadoComentario = "pendiente" | "aprobado" | "spam";

export interface ComentarioPublico {
  id: number;
  nombre: string;
  contenido: string; // texto plano
  creado_en: string;
}

export interface ComentarioPanel extends ComentarioPublico {
  correo: string;
  estado: EstadoComentario;
  articulo: Corto; // nombre = título
}

export interface PaginaComentarios {
  total: number;
  pagina: number;
  por_pagina: number;
  conteo: Record<EstadoComentario, number>;
  comentarios: ComentarioPanel[];
}

// ---------- Newsletter ----------

export type EstadoSuscriptor = "pendiente" | "confirmado" | "baja";

export interface Suscriptor {
  id: number;
  correo: string;
  estado: EstadoSuscriptor;
  creado_en: string;
  confirmado_en: string | null;
  baja_en: string | null;
}

export interface PaginaSuscriptores {
  total: number;
  pagina: number;
  por_pagina: number;
  conteo: Record<EstadoSuscriptor, number> & { nuevos_30d: number };
  suscriptores: Suscriptor[];
}

export interface ArticuloParaEnviar {
  id: number;
  titulo: string;
  slug: string;
  publicado_en: string;
  enviado_en: string | null;
}

export interface Envio {
  id: number;
  asunto: string;
  articulo_slug: string | null;
  estado: "enviando" | "enviado" | "error";
  total: number;
  enviados: number;
  fallidos: number;
  creado_en: string;
  terminado_en: string | null;
}
