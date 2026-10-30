import type { Metadata } from "next";

import { FiltroCategorias, type TarjetaCategoria } from "@/components/blog/FiltroCategorias";
import { MasLeidos, Newsletter, Publicidad, TagsPopulares } from "@/components/blog/Lateral";
import { obtener } from "@/lib/servidor";
import type { Categoria, Etiqueta, MasLeido } from "@/lib/tipos";

export const metadata: Metadata = {
  title: "Categorías",
  description: "Todos los artículos de zcorp-stack organizados por temas: programación, Python, FastAPI, SQL, QA e IA.",
};

export default async function Categorias() {
  const [categorias, etiquetas, leidos] = await Promise.all([
    obtener<Categoria[]>("/blog/categorias"),
    obtener<Etiqueta[]>("/blog/etiquetas"),
    obtener<MasLeido[]>("/blog/mas-leidos?limite=5"),
  ]);
  const todas = categorias ?? [];
  const tarjetas: TarjetaCategoria[] = todas
    .filter((c) => !c.padre_id)
    .map((c) => {
      const hijas = todas.filter((h) => h.padre_id === c.id);
      return {
        nombre: c.nombre,
        slug: c.slug,
        descripcion: c.descripcion,
        articulos: c.articulos + hijas.reduce((n, h) => n + h.articulos, 0),
        hijas: hijas.map((h) => ({ nombre: h.nombre, slug: h.slug })),
      };
    });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <FiltroCategorias
        categorias={tarjetas}
        portada={
          <>
            {/* Dibujo de fondo: capas del logo, muy tenues. */}
            <svg
              viewBox="0 0 32 32"
              className="pointer-events-none absolute -right-8 -bottom-10 hidden h-72 w-72 text-marca opacity-15 md:block"
              aria-hidden="true"
            >
              <path d="M16 7 6 12l10 5 10-5z" fill="currentColor" />
              <path d="m6 16 10 5 10-5m-20 4 10 5 10-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Categorías</h1>
            <p className="mt-2 text-texto-2">Explora todos nuestros artículos organizados por temas.</p>
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <TagsPopulares etiquetas={etiquetas ?? []} />
          <MasLeidos articulos={leidos ?? []} />
        </div>
        <aside className="space-y-6" aria-label="Barra lateral">
          <Publicidad />
          <Newsletter />
        </aside>
      </div>
    </div>
  );
}
