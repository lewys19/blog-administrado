// Encabezado y pie del blog público: blanco con detalles verdes.
import Link from "next/link";

import { EnlaceMenu } from "@/components/blog/EnlaceMenu";
import { FechaHoy } from "@/components/blog/Fecha";
import { ICONOS, Icono } from "@/components/blog/Iconos";
import { Isotipo } from "@/components/Logo";
import { LEMA, NOMBRE_SITIO, REDES } from "@/lib/sitio";

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
        placeholder="Buscar artículos y guías…"
        className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-borde bg-fondo px-3.5 py-2 text-sm outline-none focus:border-marca"
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

/** Menú principal. Las categorías del blog están en /categorias. */
function Menu() {
  return (
    <nav aria-label="Menú principal" className="border-t border-borde">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <ul className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          <li>
            <EnlaceMenu href="/">Inicio</EnlaceMenu>
          </li>
          <li>
            <EnlaceMenu href="/blog">Blog</EnlaceMenu>
          </li>
          <li>
            <EnlaceMenu href="/guias">Guías</EnlaceMenu>
          </li>
          <li>
            <EnlaceMenu href="/academia">Academia Digital</EnlaceMenu>
          </li>
          <li>
            <EnlaceMenu href="/categorias">Todas las categorías</EnlaceMenu>
          </li>
        </ul>
        <Buscador className="w-full md:w-72" />
      </div>
    </nav>
  );
}

/** Logo a la izquierda; a la derecha, la fecha, enlaces y redes. */
function Superior() {
  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-10 gap-y-3 px-4 py-4">
      <Marca />
      <div className="w-full sm:w-auto sm:flex-1">
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
  { texto: "Blog", href: "/blog" },
  { texto: "Guías", href: "/guias" },
  { texto: "Academia Digital", href: "/academia" },
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
