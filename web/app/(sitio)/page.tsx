import Link from "next/link";

import { Destacado, Grilla } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import type { Categoria, Etiqueta, PaginaArticulos } from "@/lib/tipos";

export default async function Portada() {
  const [pagina, categorias, etiquetas] = await Promise.all([
    obtener<PaginaArticulos>("/blog/articulos?por_pagina=13"),
    obtener<Categoria[]>("/blog/categorias"),
    obtener<Etiqueta[]>("/blog/etiquetas"),
  ]);
  const articulos = pagina?.articulos ?? [];
  const destacado = articulos.find((a) => a.destacado) ?? articulos[0];
  const resto = articulos.filter((a) => a !== destacado).slice(0, 12);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <section className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">Tecnología, IA y programación</h1>
        <p className="mt-3 max-w-2xl text-lg text-texto-2">
          Guías prácticas con proyectos reales: Python, FastAPI, SQL, pruebas e inteligencia artificial.
        </p>
      </section>

      {destacado ? (
        <Destacado a={destacado} />
      ) : (
        <p className="rounded-2xl border border-dashed border-borde p-10 text-center text-texto-2">
          Muy pronto, los primeros artículos.
        </p>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        <section>
          <h2 className="mb-5 text-2xl font-bold tracking-tight">Lo más reciente</h2>
          <Grilla articulos={resto} vacio="Pronto habrá más artículos aquí." />
        </section>
        <aside className="space-y-8">
          <div>
            <h2 className="mb-3 font-mono text-xs font-semibold tracking-widest text-texto-2 uppercase">Categorías</h2>
            <ul className="space-y-1">
              {(categorias ?? []).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/categoria/${c.slug}`}
                    className={`flex justify-between rounded-lg px-3 py-1.5 hover:bg-superficie ${c.padre_id ? "pl-7 text-sm" : ""}`}
                  >
                    <span>{c.nombre}</span>
                    <span className="text-sm text-texto-2 tabular-nums">{c.articulos}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {!!etiquetas?.length && (
            <div>
              <h2 className="mb-3 font-mono text-xs font-semibold tracking-widest text-texto-2 uppercase">Etiquetas</h2>
              <div className="flex flex-wrap gap-2">
                {etiquetas.slice(0, 20).map((e) => (
                  <Link
                    key={e.slug}
                    href={`/etiqueta/${e.slug}`}
                    className="rounded-full border border-borde bg-superficie px-3 py-1 text-sm hover:border-marca"
                  >
                    #{e.nombre}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
