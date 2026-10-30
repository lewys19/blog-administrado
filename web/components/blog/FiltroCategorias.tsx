"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import { ICONOS, Icono, IconoCategoria } from "@/components/blog/Iconos";

export interface TarjetaCategoria {
  nombre: string;
  slug: string;
  descripcion: string | null;
  articulos: number; // con los de sus subcategorías
  hijas: { nombre: string; slug: string }[];
}

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Buscador y grilla de categorías: filtra al escribir, sin recargar. */
export function FiltroCategorias({ categorias, portada }: { categorias: TarjetaCategoria[]; portada: ReactNode }) {
  const [q, setQ] = useState("");
  const texto = sinTildes(q.trim());
  const visibles = texto
    ? categorias.filter((c) =>
        sinTildes([c.nombre, c.descripcion ?? "", ...c.hijas.map((h) => h.nombre)].join(" ")).includes(texto),
      )
    : categorias;

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-borde bg-gradient-to-br from-marca-suave via-pagina to-pagina p-6 sm:p-10">
        {portada}
        <div className="relative mt-6 max-w-xl">
          <label htmlFor="filtro-categorias" className="sr-only">
            Buscar en categorías
          </label>
          <input
            id="filtro-categorias"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en categorías…"
            className="w-full rounded-xl border border-borde bg-pagina py-3 pr-14 pl-4 shadow-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
          />
          <span className="absolute inset-y-1.5 right-1.5 flex w-11 items-center justify-center rounded-lg bg-marca text-white">
            <Icono d={ICONOS.buscar} className="h-5 w-5" />
          </span>
        </div>
      </section>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((c) => (
          <article
            key={c.slug}
            className="group relative rounded-2xl border border-borde bg-pagina p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-marca hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca text-white">
              <IconoCategoria slug={c.slug} className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold">
              {/* Toda la tarjeta es el enlace. */}
              <Link
                href={`/categoria/${c.slug}`}
                className="after:absolute after:inset-0 group-hover:text-marca-fuerte"
              >
                {c.nombre}
              </Link>
            </h2>
            <p className="text-sm font-semibold text-marca-fuerte">
              {c.articulos} {c.articulos === 1 ? "artículo" : "artículos"}
            </p>
            {c.descripcion && <p className="mt-2 text-sm text-texto-2">{c.descripcion}</p>}
            {!!c.hijas.length && (
              <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
                {c.hijas.map((h) => (
                  <Link
                    key={h.slug}
                    href={`/categoria/${h.slug}`}
                    className="rounded-md bg-marca-suave px-2 py-0.5 text-xs font-medium text-marca-fuerte hover:bg-marca hover:text-white"
                  >
                    {h.nombre}
                  </Link>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      {!visibles.length && (
        <p className="mt-8 rounded-2xl border border-dashed border-borde p-10 text-center text-texto-2">
          Ninguna categoría coincide con «{q}».
        </p>
      )}
    </>
  );
}
