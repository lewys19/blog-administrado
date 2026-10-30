import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Grilla } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import type { Etiqueta, PaginaArticulos } from "@/lib/tipos";

type Props = PageProps<"/etiqueta/[slug]">;

async function etiqueta(slug: string) {
  return (await obtener<Etiqueta[]>("/blog/etiquetas"))?.find((e) => e.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await etiqueta((await params).slug);
  return e
    ? { title: `#${e.nombre}`, description: `Artículos sobre ${e.nombre}.` }
    : { title: "Etiqueta no encontrada" };
}

export default async function PaginaEtiqueta({ params }: Props) {
  const { slug } = await params;
  const e = await etiqueta(slug);
  if (!e) notFound();
  const pagina = await obtener<PaginaArticulos>(`/blog/articulos?etiqueta=${encodeURIComponent(slug)}&por_pagina=30`);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="font-mono text-xs font-semibold tracking-widest text-marca-fuerte uppercase">Etiqueta</p>
      <h1 className="mt-1 text-4xl font-bold tracking-tight">#{e.nombre}</h1>
      <div className="mt-8">
        <Grilla articulos={pagina?.articulos ?? []} vacio="Sin artículos con esta etiqueta." />
      </div>
    </div>
  );
}
