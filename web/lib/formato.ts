/** Número con separador de miles: 4382 → "4,382". */
export function cifra(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Fecha corta en la hora de quien mira: "29/10/2026". */
export function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE");
}

/** "hace 5 min", "hace 3 h", "hace 2 días" o la fecha. */
export function hace(iso: string, ahora: Date = new Date()): string {
  const s = Math.max(0, (ahora.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `hace ${Math.floor(s / 86400)} días`;
  return fecha(iso);
}

/** "29 de octubre de 2026" (la fecha de un artículo). */
export function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  });
}
