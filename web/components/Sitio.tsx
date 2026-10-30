import Link from "next/link";

import { Isotipo } from "@/components/Logo";

const MENU = [
  { href: "/categoria/programacion", texto: "Programación" },
  { href: "/categoria/python", texto: "Python" },
  { href: "/categoria/fastapi", texto: "FastAPI" },
  { href: "/categoria/ia", texto: "IA" },
];

export function Encabezado() {
  return (
    <header className="sticky top-0 z-30 border-b border-borde bg-superficie/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Isotipo className="h-8 w-8" />
          <span className="text-lg">zcorp-stack</span>
        </Link>
        <nav aria-label="Categorías" className="hidden flex-1 items-center gap-1 text-sm md:flex">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-full px-3 py-1.5 text-texto-2 hover:bg-fondo hover:text-texto"
            >
              {m.texto}
            </Link>
          ))}
        </nav>
        <form action="/buscar" role="search" className="ml-auto flex">
          <label htmlFor="buscar-sitio" className="sr-only">
            Buscar artículos
          </label>
          <input
            id="buscar-sitio"
            name="q"
            type="search"
            placeholder="Buscar artículos…"
            className="w-36 rounded-full border border-borde bg-fondo px-4 py-1.5 text-sm outline-none focus:border-marca sm:w-56"
          />
        </form>
      </div>
    </header>
  );
}

export function Pie() {
  return (
    <footer className="mt-16 border-t border-borde bg-superficie">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm text-texto-2">
        <span className="flex items-center gap-2 font-semibold text-texto">
          <Isotipo className="h-6 w-6" /> zcorp-stack
        </span>
        <span>Tecnología, IA y programación con proyectos reales.</span>
        <a href="/rss.xml" className="ml-auto hover:text-texto">
          RSS
        </a>
      </div>
    </footer>
  );
}
