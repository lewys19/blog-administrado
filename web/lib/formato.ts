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

/** 125 → "2 min 05 s"; 40 → "40 s". */
export function duracion(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

/** Cambio frente al periodo anterior: "+25%", "−10%"; null si antes no había nada con qué comparar. */
export function variacion(actual: number, anterior: number): string | null {
  if (anterior === 0) return null;
  const p = Math.round(((actual - anterior) / anterior) * 100);
  return `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p)}%`;
}

let nombresPaises: Intl.DisplayNames | null = null;

/** "PE" → "Perú". Sin código: "Desconocido". */
export function pais(codigo: string | null): string {
  if (!codigo) return "Desconocido";
  try {
    nombresPaises ??= new Intl.DisplayNames(["es"], { type: "region" });
    return nombresPaises.of(codigo) ?? codigo;
  } catch {
    return codigo;
  }
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Etiqueta del gráfico: "2026-10" → "oct 2026" (o "oct" corto); "2026-10-29" → "29 oct". */
export function etiquetaFecha(etiqueta: string, corta = false): string {
  const [anio, mes, dia] = etiqueta.split("-");
  const nombre = MESES[Number(mes) - 1] ?? mes;
  if (dia) return `${Number(dia)} ${nombre}`;
  return corta ? nombre : `${nombre} ${anio}`;
}
