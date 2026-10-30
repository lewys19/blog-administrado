// Encabezado y pie del blog público: blanco con detalles verdes.
import Link from "next/link";

import { EnlaceMenu } from "@/components/blog/EnlaceMenu";
import { FechaHoy } from "@/components/blog/Fecha";
import { ICONOS, Icono } from "@/components/blog/Iconos";
import { Isotipo } from "@/components/Logo";
import { obtener } from "@/lib/servidor";
import { LEMA, NOMBRE_SITIO, REDES } from "@/lib/sitio";
import type { Categoria } from "@/lib/tipos";

function Marca() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <Isotipo className="h-10 w-10" />
      <span className="leading-tight">
        <span className="block text-xl font-bold tracking-tight">{NOMBRE_SITIO}</span>
        <span className="block text-xs text-texto-2">{LEMA}</span>
      </span>
    </Link>
  );
}

export function Redes({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {REDES.map((r) => (
        <a
          key={r.red}
          href={r.url}
          target="_blank"
          rel="noreferrer"
          aria-label={r.nombre}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-marca text-white hover:bg-marca-fuerte"
        >
          <Icono d={ICONOS[r.red]} className="h-3.5 w-3.5" />
        </a>
      ))}
      <a
        href="/rss.xml"
        aria-label="RSS"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-marca text-white hover:bg-marca-fuerte"
      >
        <Icono d={ICONOS.rss} className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function Buscador({ className = "" }: { className?: string }) {
  return (
    <form action="/buscar" role="search" className={`flex ${className}`}>
      <label htmlFor="buscar-sitio" className="sr-only">
        Buscar artículos
      </label>
      <input
        id="buscar-sitio"
        name="q"
        type="search"
        placeholder="Buscar artículos, tutoriales, temas…"
        className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-borde bg-fondo px-3.5 py-2.5 text-sm outline-none focus:border-marca"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="flex items-center rounded-r-lg bg-marca px-4 text-white hover:bg-marca-fuerte"
      >
        <Icono d={ICONOS.buscar} className="h-4 w-4" />
      </button>
    </form>
  );
}

/** Menú de categorías: las principales, con sus subcategorías en un desplegable (en computadora). */
async function Menu() {
  const categorias = (await obtener<Categoria[]>("/blog/categorias")) ?? [];
  const principales = categorias.filter((c) => !c.padre_id);
  return (
    <nav aria-label="Categorías" className="border-t border-borde">
      <ul className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 md:overflow-visible">
        <li>
          <EnlaceMenu href="/">Inicio</EnlaceMenu>
        </li>
        {principales.map((c) => {
          const hijas = categorias.filter((h) => h.padre_id === c.id);
          return (
            <li key={c.slug} className="group relative">
              <EnlaceMenu href={`/categoria/${c.slug}`}>
                {c.nombre}
                {!!hijas.length && <Icono d={ICONOS.abajo} className="hidden h-3.5 w-3.5 md:block" />}
              </EnlaceMenu>
              {!!hijas.length && (
                <ul className="absolute top-full left-0 z-40 hidden min-w-48 rounded-xl border border-borde bg-pagina p-1.5 shadow-lg md:group-focus-within:block md:group-hover:block">
                  {hijas.map((h) => (
                    <li key={h.slug}>
                      <Link
                        href={`/categoria/${h.slug}`}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-marca-suave hover:text-marca-fuerte"
                      >
                        {h.nombre}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        <li>
          <EnlaceMenu href="/categorias">Todas las categorías</EnlaceMenu>
        </li>
      </ul>
    </nav>
  );
}

/** Logo a la izquierda; a la derecha, arriba la fecha, enlaces y redes, y abajo el buscador ancho. */
function Superior() {
  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-10 gap-y-3 px-4 py-4">
      <Marca />
      <div className="w-full space-y-2.5 sm:w-auto sm:flex-1">
        <div className="hidden items-center justify-end gap-5 text-xs text-texto-2 lg:flex">
          <span className="flex items-center gap-1.5 capitalize">
            <Icono d={ICONOS.calendario} className="h-4 w-4" />
            <FechaHoy />
          </span>
          <Link href="/sobre-nosotros" className="hover:text-marca-fuerte">
            Sobre nosotros
          </Link>
          <Link href="/contacto" className="hover:text-marca-fuerte">
            Contacto
          </Link>
          <Redes />
        </div>
        <Buscador className="w-full" />
      </div>
    </div>
  );
}

export async function Encabezado() {
  return (
    <header className="border-b border-borde bg-pagina">
      <Superior />
      <Menu />
    </header>
  );
}

/** Mientras llegan las categorías del menú. */
export function EncabezadoCargando() {
  return (
    <header className="border-b border-borde bg-pagina">
      <Superior />
      <div className="h-[53px] border-t border-borde" />
    </header>
  );
}

const ENLACES_PIE = [
  { texto: "Inicio", href: "/" },
  { texto: "Categorías", href: "/categorias" },
  { texto: "Buscar", href: "/buscar" },
  { texto: "Sobre nosotros", href: "/sobre-nosotros" },
  { texto: "Contacto", href: "/contacto" },
];

export function Pie() {
  return (
    <footer className="mt-16 border-t border-borde bg-pagina">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-8">
        <Marca />
        <nav aria-label="Pie de página">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-texto-2">
            {ENLACES_PIE.map((e) => (
              <li key={e.href}>
                <Link href={e.href} className="hover:text-marca-fuerte">
                  {e.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Redes />
      </div>
      <div className="border-t border-borde">
        <p className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-texto-2">
          <span>© {NOMBRE_SITIO}. Todos los derechos reservados.</span>
          <span>Tecnología · IA · Programación</span>
        </p>
      </div>
    </footer>
  );
}
