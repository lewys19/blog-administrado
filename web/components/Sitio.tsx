// Encabezado y pie del blog público: blanco con detalles verdes.
import Link from "next/link";

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
          className="flex h-8 w-8 items-center justify-center rounded-full bg-marca text-white hover:bg-marca-fuerte"
        >
          <Icono d={ICONOS[r.red]} className="h-4 w-4" />
        </a>
      ))}
      <a
        href="/rss.xml"
        aria-label="RSS"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-marca text-white hover:bg-marca-fuerte"
      >
        <Icono d={ICONOS.rss} className="h-4 w-4" />
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
        className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-borde bg-pagina px-3.5 py-2 text-sm outline-none focus:border-marca"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="flex items-center rounded-r-lg bg-marca px-3 text-white hover:bg-marca-fuerte"
      >
        <Icono d={ICONOS.buscar} className="h-4 w-4" />
      </button>
    </form>
  );
}

const enlaceMenu = "flex items-center gap-1 whitespace-nowrap px-3 py-3 text-sm font-semibold hover:text-marca-fuerte";

/** Menú de categorías: las principales, con sus subcategorías en un desplegable (en computadora). */
async function Menu() {
  const categorias = (await obtener<Categoria[]>("/blog/categorias")) ?? [];
  const principales = categorias.filter((c) => !c.padre_id);
  return (
    <nav aria-label="Categorías" className="border-t border-borde">
      <ul className="mx-auto flex max-w-7xl items-center overflow-x-auto px-2 md:overflow-visible">
        <li>
          <Link href="/" className={enlaceMenu}>
            Inicio
          </Link>
        </li>
        {principales.map((c) => {
          const hijas = categorias.filter((h) => h.padre_id === c.id);
          return (
            <li key={c.slug} className="group relative">
              <Link href={`/categoria/${c.slug}`} className={enlaceMenu}>
                {c.nombre}
                {!!hijas.length && <Icono d={ICONOS.abajo} className="hidden h-3.5 w-3.5 md:block" />}
              </Link>
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
          <Link href="/categorias" className={enlaceMenu}>
            Todas las categorías
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function Superior() {
  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
      <Marca />
      <div className="hidden items-center gap-4 text-xs text-texto-2 lg:flex">
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
      </div>
      <div className="ml-auto flex w-full items-center gap-4 sm:w-auto">
        <Buscador className="w-full sm:w-72" />
        <Redes className="hidden md:flex" />
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
      <div className="h-[45px] border-t border-borde" />
    </header>
  );
}

export function Pie() {
  return (
    <footer className="mt-16 border-t border-borde bg-pagina">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Marca />
          <p className="max-w-sm text-sm text-texto-2">
            Guías prácticas de tecnología, inteligencia artificial y programación, con proyectos reales.
          </p>
          <Redes />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">El blog</h2>
          <ul className="space-y-2 text-sm text-texto-2">
            <li>
              <Link href="/categorias" className="hover:text-marca-fuerte">
                Categorías
              </Link>
            </li>
            <li>
              <Link href="/buscar" className="hover:text-marca-fuerte">
                Buscar
              </Link>
            </li>
            <li>
              <a href="/rss.xml" className="hover:text-marca-fuerte">
                RSS
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">{NOMBRE_SITIO}</h2>
          <ul className="space-y-2 text-sm text-texto-2">
            <li>
              <Link href="/sobre-nosotros" className="hover:text-marca-fuerte">
                Sobre nosotros
              </Link>
            </li>
            <li>
              <Link href="/contacto" className="hover:text-marca-fuerte">
                Contacto y publicidad
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-borde py-4 text-center text-xs text-texto-2">
        © {NOMBRE_SITIO} · Tecnología, IA y programación
      </p>
    </footer>
  );
}
