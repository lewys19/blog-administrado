// Datos y textos de la Academia Digital que usan la web y el panel.

export type Nivel = "principiante" | "intermedio" | "avanzado";

export const NIVELES: Record<Nivel, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export type Tipo = "curso" | "manual" | "separata" | "sistema";

/** Las secciones de la Academia: su dirección (/academia/<seccion>), su tipo y sus textos. */
export const SECCIONES_ACADEMIA = {
  cursos: { tipo: "curso", titulo: "Cursos", uno: "curso", con: "el curso", contenido: "Temario" },
  manuales: { tipo: "manual", titulo: "Manuales", uno: "manual", con: "el manual", contenido: "Contenido" },
  separatas: { tipo: "separata", titulo: "Separatas", uno: "separata", con: "la separata", contenido: "Contenido" },
  sistemas: { tipo: "sistema", titulo: "Sistemas", uno: "sistema", con: "el sistema", contenido: "Funciones" },
} as const;

export type SeccionAcademia = keyof typeof SECCIONES_ACADEMIA;

export function seccionAcademia(valor: string): SeccionAcademia | null {
  return Object.hasOwn(SECCIONES_ACADEMIA, valor) ? (valor as SeccionAcademia) : null;
}

function seccionDe(tipo: Tipo): SeccionAcademia {
  return (Object.keys(SECCIONES_ACADEMIA) as SeccionAcademia[]).find((s) => SECCIONES_ACADEMIA[s].tipo === tipo)!;
}

export function rutaCurso(c: { tipo: Tipo; slug: string }): string {
  return `/academia/${seccionDe(c.tipo)}/${c.slug}`;
}

/** Gratis, $8 o $8.50: sin decimales cuando el precio es exacto. */
export function precioTexto(precio: number): string {
  if (precio === 0) return "Gratis";
  return `$${Number.isInteger(precio) ? precio : precio.toFixed(2)}`;
}

/** Enlace a WhatsApp con el mensaje ya escrito. Sin número, WhatsApp deja elegir el contacto. */
export function enlaceWhatsapp(
  numero: string,
  curso: { tipo: Tipo; titulo: string; precio: number },
  codigo: string,
): string {
  const que = SECCIONES_ACADEMIA[seccionDe(curso.tipo)].con;
  return conMensaje(
    numero,
    `Hola, quiero comprar ${que} «${curso.titulo}» (${precioTexto(curso.precio)}). Mi código es ${codigo}.`,
  );
}

export function enlacePromocion(numero: string, promocion: { titulo: string; precio: number }): string {
  return conMensaje(numero, `Hola, quiero la promoción «${promocion.titulo}» (${precioTexto(promocion.precio)}).`);
}

function conMensaje(numero: string, mensaje: string): string {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`;
}
