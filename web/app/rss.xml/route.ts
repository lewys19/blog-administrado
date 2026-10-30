import { obtener } from "@/lib/servidor";
import { NOMBRE_SITIO, SITIO_URL } from "@/lib/sitio";
import type { PaginaArticulos } from "@/lib/tipos";

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** RSS con los 30 artículos más recientes: lectores de noticias y el boletín futuro. */
export async function GET() {
  const pagina = await obtener<PaginaArticulos>("/blog/articulos?por_pagina=30");
  const items = (pagina?.articulos ?? [])
    .map(
      (a) => `    <item>
      <title>${escapar(a.titulo)}</title>
      <link>${SITIO_URL}/blog/${a.slug}</link>
      <guid isPermaLink="true">${SITIO_URL}/blog/${a.slug}</guid>
      <pubDate>${new Date(a.publicado_en).toUTCString()}</pubDate>
      <author>${escapar(a.autor.nombre)}</author>${a.categoria ? `\n      <category>${escapar(a.categoria.nombre)}</category>` : ""}
      <description>${escapar(a.resumen ?? "")}</description>
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${NOMBRE_SITIO}</title>
    <link>${SITIO_URL}</link>
    <description>Tecnología, IA y programación con proyectos reales.</description>
    <language>es</language>
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
