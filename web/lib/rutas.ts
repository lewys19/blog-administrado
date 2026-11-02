// Dirección pública de un artículo: las guías viven en /guias/<tema>/<slug> y el resto en /blog/<slug>.
export function rutaArticulo(a: { slug: string; tipo?: string; tema?: { slug: string } | string | null }): string {
  if (a.tipo !== "guia") return `/blog/${a.slug}`;
  const tema = typeof a.tema === "string" ? a.tema : (a.tema?.slug ?? "otros");
  return `/guias/${tema}/${a.slug}`;
}
