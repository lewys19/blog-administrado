import Link from "next/link";
import { notFound } from "next/navigation";

import { Migas } from "@/components/blog/Lateral";
import { Grilla } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import type { Categoria, PaginaArticulos } from "@/lib/tipos";

// /guias (todas) y /guias/<tema> (solo ese tema): tutoriales paso a paso, con páginas de 12.
const POR_PAGINA = 12;

export async function temasGuia() {
  return (await obtener<Categoria[]>("/blog/temas-guia")) ?? [];
}

export async function ListaGuias({ tema, pagina }: { tema?: string; pagina: number }) {
  const temas = await temasGuia();
  const elegido = tema ? temas.find((t) => t.slug === tema) : undefined;
  if (tema && !elegido) notFound();

  const consulta = new URLSearchParams({ tipo: "guia", pagina: String(pagina), por_pagina: String(POR_PAGINA) });
  if (tema) consulta.set("tema", tema);
  const datos = await obtener<PaginaArticulos>(`/blog/articulos?${consulta}`);
  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const base = tema ? `/guias/${tema}` : "/guias";
  const enlace = (n: number) => (n > 1 ? `${base}?pagina=${n}` : base);

  const chip = (activo: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
      activo ? "border-marca bg-marca text-white" : "border-borde hover:border-marca hover:text-marca-fuerte"
    }`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <Migas items={elegido ? [{ texto: "Guías", href: "/guias" }, { texto: elegido.nombre }] : [{ texto: "Guías" }]} />
      <h1 className="mt-5 text-4xl font-bold tracking-tight">{elegido ? `Guías de ${elegido.nombre}` : "Guías"}</h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-lg text-texto-2">
          Tutoriales paso a paso escritos por la comunidad: cómo instalar, configurar y levantar proyectos reales.
        </p>
      </div>

      <nav aria-label="Temas" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        <Link href="/guias" className={chip(!tema)}>
          Todas
        </Link>
        {temas.map((t) => (
          <Link key={t.slug} href={`/guias/${t.slug}`} className={chip(t.slug === tema)}>
            {t.nombre} <span className="opacity-70">({t.articulos})</span>
          </Link>
        ))}
      </nav>

      <p className="mt-6 mb-4 text-sm text-texto-2">{total} guía(s)</p>
      <Grilla articulos={datos?.articulos ?? []} vacio="Todavía no hay guías de este tema." />

      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {pagina > 1 && (
            <Link href={enlace(pagina - 1)} className={chip(false)}>
              ← Anterior
            </Link>
          )}
          {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={enlace(n)} aria-current={n === pagina ? "page" : undefined} className={chip(n === pagina)}>
              {n}
            </Link>
          ))}
          {pagina < paginas && (
            <Link href={enlace(pagina + 1)} className={chip(false)}>
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

export function numeroPagina(valor: string | string[] | undefined): number {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return Math.max(1, Number.parseInt(v ?? "", 10) || 1);
}
