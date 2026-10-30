import Link from "next/link";

import { IconoCategoria } from "@/components/blog/Iconos";
import { MasLeidos, Newsletter, Publicidad, TagsPopulares } from "@/components/blog/Lateral";
import { Destacado, Grilla } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import type { Categoria, Etiqueta, MasLeido, PaginaArticulos } from "@/lib/tipos";

export default async function Portada() {
  const [pagina, categorias, etiquetas, leidos] = await Promise.all([
    obtener<PaginaArticulos>("/blog/articulos?por_pagina=13"),
    obtener<Categoria[]>("/blog/categorias"),
    obtener<Etiqueta[]>("/blog/etiquetas"),
    obtener<MasLeido[]>("/blog/mas-leidos?limite=5"),
  ]);
  const articulos = pagina?.articulos ?? [];
  const destacado = articulos.find((a) => a.destacado) ?? articulos[0];
  const resto = articulos.filter((a) => a !== destacado).slice(0, 12);
  const principales = (categorias ?? []).filter((c) => !c.padre_id);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <h1 className="sr-only">zcorp-stack: tecnología, IA y programación</h1>
      {destacado ? (
        <Destacado a={destacado} />
      ) : (
        <p className="rounded-2xl border border-dashed border-borde p-10 text-center text-texto-2">
          Muy pronto, los primeros artículos.
        </p>
      )}

      {!!principales.length && (
        <nav aria-label="Explorar por categoría" className="mt-6 flex flex-wrap gap-2">
          {principales.map((c) => (
            <Link
              key={c.slug}
              href={`/categoria/${c.slug}`}
              className="flex items-center gap-2 rounded-xl border border-borde bg-pagina px-3.5 py-2 text-sm font-semibold shadow-sm hover:border-marca hover:text-marca-fuerte"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-marca-suave text-marca-fuerte">
                <IconoCategoria slug={c.slug} className="h-4 w-4" />
              </span>
              {c.nombre}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <div className="mb-5 flex items-end justify-between gap-3 border-b border-borde pb-3">
            <h2 className="text-2xl font-bold tracking-tight">Lo más reciente</h2>
            <Link href="/categorias" className="text-sm font-semibold text-marca-fuerte hover:underline">
              Ver categorías →
            </Link>
          </div>
          <Grilla articulos={resto} vacio="Pronto habrá más artículos aquí." columnas={2} />
        </section>
        <aside className="space-y-6" aria-label="Barra lateral">
          <MasLeidos articulos={leidos ?? []} />
          <TagsPopulares etiquetas={etiquetas ?? []} />
          <Publicidad />
          <Newsletter />
        </aside>
      </div>
    </div>
  );
}
