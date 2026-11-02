import type { MetadataRoute } from "next";

import { obtener } from "@/lib/servidor";
import { SITIO_URL } from "@/lib/sitio";
import type { Categoria } from "@/lib/tipos";

// Lista de páginas para Google: portada, páginas fijas, categorías y cada artículo publicado con su fecha.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articulos, categorias] = await Promise.all([
    obtener<{ slug: string; actualizado_en: string }[]>("/blog/mapa"),
    obtener<Categoria[]>("/blog/categorias"),
  ]);
  return [
    { url: SITIO_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITIO_URL}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITIO_URL}/categorias`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITIO_URL}/sobre-nosotros`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITIO_URL}/contacto`, changeFrequency: "yearly", priority: 0.3 },
    ...(categorias ?? []).map((c) => ({
      url: `${SITIO_URL}/categoria/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...(articulos ?? []).map((a) => ({
      url: `${SITIO_URL}/blog/${a.slug}`,
      lastModified: a.actualizado_en,
      priority: 0.8,
    })),
  ];
}
