import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GrillaCursos } from "@/components/academia/Cursos";
import { LateralCursos } from "@/components/academia/Lateral";
import { ICONOS, Icono } from "@/components/blog/Iconos";
import { Migas } from "@/components/blog/Lateral";
import { numeroPagina } from "@/components/blog/ListaGuias";
import { SECCIONES_ACADEMIA, seccionAcademia } from "@/lib/academia";
import { obtener } from "@/lib/servidor";
import type { CategoriaAcademia, LateralAcademia, PaginaCursos } from "@/lib/tipos";

type Props = PageProps<"/academia/[seccion]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seccion = seccionAcademia((await params).seccion);
  if (!seccion) return { title: "Sección no encontrada" };
  const { titulo } = SECCIONES_ACADEMIA[seccion];
  return {
    title: titulo,
    description: `${titulo} de la Academia Digital: programación, IA, DevOps, Linux, ciberseguridad y más.`,
    alternates: { canonical: `/academia/${seccion}` },
  };
}

const POR_PAGINA = 9;
const FILTRO = "rounded-lg px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap";

function texto(valor: string | string[] | undefined): string {
  return (typeof valor === "string" ? valor : "").trim().slice(0, 100);
}

export default async function Lista({ params, searchParams }: Props) {
  const [{ seccion: valor }, sp] = await Promise.all([params, searchParams]);
  const seccion = seccionAcademia(valor);
  if (!seccion) notFound();
  const { tipo, titulo, uno } = SECCIONES_ACADEMIA[seccion];
  const base = `/academia/${seccion}`;
  const slug = texto(sp.categoria);
  const q = texto(sp.q);
  const pagina = numeroPagina(sp.pagina);

  const filtros = new URLSearchParams();
  if (slug) filtros.set("categoria", slug);
  if (q) filtros.set("q", q);
  const consulta = new URLSearchParams(filtros);
  consulta.set("tipo", tipo);
  consulta.set("pagina", String(pagina));
  consulta.set("por_pagina", String(POR_PAGINA));

  const [categorias, datos, lateral] = await Promise.all([
    obtener<CategoriaAcademia[]>("/academia/categorias"),
    obtener<PaginaCursos>(`/academia/cursos?${consulta}`),
    obtener<LateralAcademia>("/academia/lateral"),
  ]);
  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const actual = categorias?.find((c) => c.slug === slug);

  const enlace = (n: number) => {
    const p = new URLSearchParams(filtros);
    if (n > 1) p.set("pagina", String(n));
    return p.size ? `${base}?${p}` : base;
  };
  const estilo = (activo: boolean) =>
    `${FILTRO} ${activo ? "bg-marca text-white" : "bg-marca-suave text-marca-fuerte hover:bg-marca hover:text-white"}`;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <Migas items={[{ texto: "Academia Digital", href: "/academia" }, { texto: titulo }]} />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {q ? `Resultados para «${q}»` : actual ? `${titulo} de ${actual.nombre}` : titulo}
        </h1>

        <form action={base} role="search" className="mt-5 flex">
          {slug && <input type="hidden" name="categoria" value={slug} />}
          <label htmlFor="buscar-curso" className="sr-only">
            Buscar en {titulo.toLowerCase()}
          </label>
          <input
            id="buscar-curso"
            name="q"
            type="search"
            maxLength={100}
            defaultValue={q}
            placeholder={`Buscar en ${titulo.toLowerCase()}…`}
            className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-borde bg-pagina px-3.5 py-2.5 text-sm outline-none focus:border-marca"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="flex items-center rounded-r-lg bg-marca px-4 text-white hover:bg-marca-fuerte"
          >
            <Icono d={ICONOS.buscar} className="h-4 w-4" />
          </button>
        </form>

        <nav aria-label="Filtrar por categoría" className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <Link href={base} className={estilo(!actual && !q)}>
            Todos
          </Link>
          {(categorias ?? []).map((c) => (
            <Link key={c.slug} href={`${base}?categoria=${c.slug}`} className={estilo(c.slug === slug)}>
              {c.nombre}
            </Link>
          ))}
        </nav>

        <p className="mt-4 mb-4 text-sm text-texto-2">
          {total} {total === 1 ? uno : titulo.toLowerCase()}
        </p>
        <GrillaCursos
          cursos={datos?.cursos ?? []}
          conLateral
          vacio={q ? "No encontramos nada con esa búsqueda." : undefined}
        />

        {paginas > 1 && (
          <nav aria-label="Páginas" className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {pagina > 1 && (
              <Link href={enlace(pagina - 1)} className={estilo(false)}>
                ← Anterior
              </Link>
            )}
            {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={enlace(n)}
                aria-current={n === pagina ? "page" : undefined}
                className={estilo(n === pagina)}
              >
                {n}
              </Link>
            ))}
            {pagina < paginas && (
              <Link href={enlace(pagina + 1)} className={estilo(false)}>
                Siguiente →
              </Link>
            )}
          </nav>
        )}
      </div>
      <LateralCursos datos={lateral} />
    </div>
  );
}
