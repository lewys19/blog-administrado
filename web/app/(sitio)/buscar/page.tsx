import type { Metadata } from "next";

import { Grilla } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import type { PaginaArticulos } from "@/lib/tipos";

export const metadata: Metadata = { title: "Buscar", robots: { index: false } };

export default async function Buscar({ searchParams }: PageProps<"/buscar">) {
  const valor = (await searchParams).q;
  const q = (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? "";
  const pagina = q ? await obtener<PaginaArticulos>(`/blog/articulos?q=${encodeURIComponent(q)}&por_pagina=30`) : null;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{q ? `Resultados para «${q}»` : "Buscar artículos"}</h1>
      <form action="/buscar" role="search" className="mt-5 flex max-w-xl gap-2">
        <label htmlFor="buscar-pagina" className="sr-only">
          Qué buscas
        </label>
        <input
          id="buscar-pagina"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Ej. fastapi postgresql"
          className="min-w-0 flex-1 rounded-lg border border-borde bg-superficie px-4 py-2.5 outline-none focus:border-marca"
        />
        <button
          type="submit"
          className="rounded-lg bg-lateral px-5 py-2.5 font-semibold text-white hover:bg-lateral-activo"
        >
          Buscar
        </button>
      </form>
      {q && (
        <div className="mt-8">
          <p className="mb-4 text-texto-2">{pagina?.total ?? 0} artículo(s)</p>
          <Grilla
            articulos={pagina?.articulos ?? []}
            vacio="No encontramos artículos con esas palabras. Prueba con otras."
          />
        </div>
      )}
    </div>
  );
}
