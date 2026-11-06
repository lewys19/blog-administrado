// Piezas públicas de la Academia Digital: precio y tarjeta de curso.
import Link from "next/link";

import { ICONOS, Icono, IconoCategoria } from "@/components/blog/Iconos";
import { NIVELES, precioTexto, rutaCurso } from "@/lib/academia";
import type { CursoTarjeta } from "@/lib/tipos";

export function Precio({ curso, grande = false }: { curso: CursoTarjeta; grande?: boolean }) {
  return (
    <p className="flex items-baseline gap-2">
      {curso.precio_anterior !== null && (
        <s className={`text-texto-2 ${grande ? "text-lg" : "text-sm"}`}>
          <span className="sr-only">Antes: </span>
          {precioTexto(curso.precio_anterior)}
        </s>
      )}
      <span className={`font-bold text-marca-fuerte ${grande ? "text-4xl" : "text-xl"}`}>
        <span className="sr-only">Ahora: </span>
        {precioTexto(curso.precio)}
      </span>
    </p>
  );
}

export function Portada({ curso }: { curso: CursoTarjeta }) {
  return curso.portada ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={curso.portada} alt="" width={1200} height={630} className="aspect-[1200/630] w-full object-cover" />
  ) : (
    <div className="flex aspect-[1200/630] items-center justify-center bg-lateral text-white">
      <IconoCategoria slug={curso.categoria.slug} className="h-12 w-12" />
    </div>
  );
}

export function TarjetaCurso({ curso }: { curso: CursoTarjeta }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-borde bg-pagina shadow-sm transition hover:-translate-y-0.5 hover:border-marca hover:shadow-md">
      <div className="relative">
        <Portada curso={curso} />
        {curso.tipo !== "sistema" && (
          <span className="absolute top-2.5 left-2.5 rounded-md bg-marca px-2 py-0.5 text-xs font-semibold text-white">
            {NIVELES[curso.nivel]}
          </span>
        )}
        {curso.horas !== null && (
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-lateral px-2 py-0.5 text-xs font-semibold text-white">
            <Icono d={ICONOS.reloj} className="h-3.5 w-3.5" /> {curso.horas} h
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="leading-snug font-bold text-balance">
          {/* Toda la tarjeta lleva al curso. */}
          <Link href={rutaCurso(curso)} className="after:absolute after:inset-0 group-hover:text-marca-fuerte">
            {curso.titulo}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-texto-2">{curso.descripcion}</p>
        <div className="mt-auto space-y-3 pt-1">
          <Precio curso={curso} />
          <Link
            href={rutaCurso(curso)}
            className="relative z-10 flex items-center justify-center rounded-lg bg-marca px-4 py-2.5 text-sm font-semibold text-sobre-marca hover:bg-marca-fuerte"
          >
            Ver detalles
          </Link>
        </div>
      </div>
    </article>
  );
}

export function GrillaCursos({
  cursos,
  conLateral = false,
  vacio = "Muy pronto habrá contenido aquí.",
}: {
  cursos: CursoTarjeta[];
  conLateral?: boolean;
  vacio?: string;
}) {
  if (!cursos.length) {
    return <p className="rounded-2xl border border-dashed border-borde p-8 text-center text-texto-2">{vacio}</p>;
  }
  return (
    <div className={`grid gap-5 sm:grid-cols-2 ${conLateral ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
      {cursos.map((c) => (
        <TarjetaCurso key={c.slug} curso={c} />
      ))}
    </div>
  );
}
