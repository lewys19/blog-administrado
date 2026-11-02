import type { Metadata } from "next";
import Link from "next/link";

import { Migas } from "@/components/blog/Lateral";
import { Grilla } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import type { Categoria, PaginaArticulos } from "@/lib/tipos";

// /blog: todas las noticias y artículos, de la más nueva a la más vieja, con filtro por categoría y páginas.
const POR_PAGINA = 12;

export const metadata: Metadata = {
  title: "Blog",
  description: "Noticias y artículos de tecnología, inteligencia artificial y programación.",
  alternates: { canonical: "/blog" },
};

function uno(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? "";
}

function enlace(categoria: string, pagina: number): string {
  const p = new URLSearchParams();
  if (categoria) p.set("categoria", categoria);
  if (pagina > 1) p.set("pagina", String(pagina));
  const q = p.toString();
  return q ? `/blog?${q}` : "/blog";
}

export default async function Blog({ searchParams }: PageProps<"/blog">) {
  const sp = await searchParams;
  const categoria = uno(sp.categoria);
  const pagina = Math.max(1, Number.parseInt(uno(sp.pagina), 10) || 1);

  const consulta = new URLSearchParams({ tipo: "noticia", pagina: String(pagina), por_pagina: String(POR_PAGINA) });
  if (categoria) consulta.set("categoria", categoria);
  const [datos, categorias] = await Promise.all([
    obtener<PaginaArticulos>(`/blog/articulos?${consulta}`),
    obtener<Categoria[]>("/blog/categorias"),
  ]);
  const principales = (categorias ?? []).filter((c) => !c.padre_id);
  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const elegida = principales.find((c) => c.slug === categoria);

  const chip = (activo: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
      activo ? "border-marca bg-marca text-white" : "border-borde hover:border-marca hover:text-marca-fuerte"
    }`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <Migas items={[{ texto: "Blog" }]} />
      <h1 className="mt-5 text-4xl font-bold tracking-tight">{elegida ? `Blog · ${elegida.nombre}` : "Blog"}</h1>
      <p className="mt-2 max-w-2xl text-lg text-texto-2">
        Noticias, novedades y artículos de tecnología, inteligencia artificial y programación.
      </p>

      <nav aria-label="Filtrar por categoría" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        <Link href="/blog" className={chip(!categoria)}>
          Todo
        </Link>
        {principales.map((c) => (
          <Link key={c.slug} href={enlace(c.slug, 1)} className={chip(c.slug === categoria)}>
            {c.nombre}
          </Link>
        ))}
      </nav>

      <p className="mt-6 mb-4 text-sm text-texto-2">{total} artículo(s)</p>
      <Grilla articulos={datos?.articulos ?? []} vacio="Todavía no hay artículos aquí." />

      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-10 flex items-center justify-center gap-2">
          {pagina > 1 && (
            <Link href={enlace(categoria, pagina - 1)} className={chip(false)}>
              ← Anterior
            </Link>
          )}
          {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={enlace(categoria, n)}
              aria-current={n === pagina ? "page" : undefined}
              className={chip(n === pagina)}
            >
              {n}
            </Link>
          ))}
          {pagina < paginas && (
            <Link href={enlace(categoria, pagina + 1)} className={chip(false)}>
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
