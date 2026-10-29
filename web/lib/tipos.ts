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
