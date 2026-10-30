/** Una entrada de la tabla de contenidos. */
export interface Entrada {
  id: string;
  texto: string;
  nivel: 2 | 3;
}

const ENTIDADES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/**
 * Tabla de contenidos a partir del HTML del artículo: los subtítulos h2/h3 que ya traen id
 * (los pone el servidor al convertir el Markdown).
 */
export function indice(html: string): Entrada[] {
  const entradas: Entrada[] = [];
  for (const m of html.matchAll(/<h([23])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const texto = m[3]
      .replace(/<[^>]+>/g, "")
      .replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENTIDADES[e] ?? e)
      .trim();
    if (texto) entradas.push({ id: m[2], texto, nivel: m[1] === "2" ? 2 : 3 });
  }
  return entradas;
}
