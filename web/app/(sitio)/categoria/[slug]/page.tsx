import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IconoCategoria } from "@/components/blog/Iconos";
import { Migas } from "@/components/blog/Lateral";
import { Grilla } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import type { Categoria, PaginaArticulos } from "@/lib/tipos";

type Props = PageProps<"/categoria/[slug]">;

async function categoria(slug: string) {
  return (await obtener<Categoria[]>("/blog/categorias"))?.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await categoria((await params).slug);
  return c
    ? { title: c.nombre, description: c.descripcion ?? `Artículos de ${c.nombre}.` }
    : { title: "Categoría no encontrada" };
}

export default async function PaginaCategoria({ params }: Props) {
  const { slug } = await params;
  const c = await categoria(slug);
  if (!c) notFound();
  const pagina = await obtener<PaginaArticulos>(`/blog/articulos?categoria=${encodeURIComponent(slug)}&por_pagina=30`);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <Migas items={[{ texto: "Categorías", href: "/categorias" }, { texto: c.nombre }]} />
      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca text-white">
          <IconoCategoria slug={c.slug} className="h-6 w-6" />
        </span>
        <h1 className="text-4xl font-bold tracking-tight">{c.nombre}</h1>
      </div>
      {c.descripcion && <p className="mt-2 max-w-2xl text-lg text-texto-2">{c.descripcion}</p>}
      <div className="mt-8">
        <Grilla articulos={pagina?.articulos ?? []} vacio={`Todavía no hay artículos de ${c.nombre}.`} />
      </div>
    </div>
  );
}
