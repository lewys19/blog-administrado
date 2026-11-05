import type { MetadataRoute } from "next";

import { rutaCurso, SECCIONES_ACADEMIA, type Tipo } from "@/lib/academia";
import { obtener } from "@/lib/servidor";
import { SITIO_URL } from "@/lib/sitio";
import type { Categoria } from "@/lib/tipos";
import { rutaArticulo } from "@/lib/rutas";

// Lista de páginas para Google: portada, páginas fijas, categorías y cada artículo publicado con su fecha.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articulos, categorias, cursos] = await Promise.all([
    obtener<{ slug: string; tipo: string; tema: string | null; actualizado_en: string }[]>("/blog/mapa"),
    obtener<Categoria[]>("/blog/categorias"),
    obtener<{ cursos: { slug: string; tipo: Tipo }[] }>("/academia/cursos?por_pagina=100"),
  ]);
  return [
    { url: SITIO_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITIO_URL}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITIO_URL}/guias`, changeFrequency: "weekly", priority: 0.9 },
    ...Object.keys(SECCIONES_ACADEMIA).map((s) => ({
      url: `${SITIO_URL}/academia/${s}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITIO_URL}/academia/promociones`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITIO_URL}/categorias`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITIO_URL}/sobre-nosotros`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITIO_URL}/contacto`, changeFrequency: "yearly", priority: 0.3 },
    ...(categorias ?? []).map((c) => ({
      url: `${SITIO_URL}/categoria/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...(cursos?.cursos ?? []).map((c) => ({ url: `${SITIO_URL}${rutaCurso(c)}`, priority: 0.7 })),
    ...(articulos ?? []).map((a) => ({
      url: `${SITIO_URL}${rutaArticulo(a)}`,
      lastModified: a.actualizado_en,
      priority: 0.8,
    })),
  ];
}
