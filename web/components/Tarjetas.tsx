import Link from "next/link";

import { fechaLarga } from "@/lib/formato";
import type { ArticuloTarjeta } from "@/lib/tipos";

function Portada({ a, clase }: { a: ArticuloTarjeta; clase: string }) {
  return a.imagen ? (
    // Imágenes ya optimizadas por la API (WebP 1200×630).
    // eslint-disable-next-line @next/next/no-img-element
    <img src={a.imagen} alt="" className={`${clase} w-full object-cover`} loading="lazy" />
  ) : (
    // Sin portada: un fondo con la categoría, para que todas las tarjetas tengan el mismo alto.
    <div
      className={`${clase} flex w-full items-center justify-center bg-gradient-to-br from-lateral to-lateral-activo`}
    >
      <span className="font-mono text-sm tracking-widest text-lateral-texto uppercase">
        {a.categoria?.nombre ?? "zcorp-stack"}
      </span>
    </div>
  );
}

export function Meta({ a }: { a: ArticuloTarjeta }) {
  return (
    <p className="text-sm text-texto-2">
      <Link href={`/autores/${a.autor.username}`} className="font-medium text-texto hover:underline">
        {a.autor.nombre}
      </Link>{" "}
      · <time dateTime={a.publicado_en}>{fechaLarga(a.publicado_en)}</time> · {a.minutos_lectura} min de lectura
    </p>
  );
}

export function Tarjeta({ a }: { a: ArticuloTarjeta }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-borde bg-superficie transition hover:border-marca">
      <Link href={`/blog/${a.slug}`} tabIndex={-1} aria-hidden="true">
        <Portada a={a} clase="aspect-[1200/630]" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {a.categoria && (
          <Link
            href={`/categoria/${a.categoria.slug}`}
            className="font-mono text-xs font-semibold tracking-wider text-marca-fuerte uppercase"
          >
            {a.categoria.nombre}
          </Link>
        )}
        <h3 className="text-lg leading-snug font-bold text-balance">
          <Link href={`/blog/${a.slug}`} className="hover:underline">
            {a.titulo}
          </Link>
        </h3>
        {a.resumen && <p className="line-clamp-3 text-texto-2">{a.resumen}</p>}
        <div className="mt-auto pt-2">
          <Meta a={a} />
        </div>
      </div>
    </article>
  );
}

/** El artículo destacado de la portada: grande, imagen al lado. */
export function Destacado({ a }: { a: ArticuloTarjeta }) {
  return (
    <article className="grid overflow-hidden rounded-3xl border border-borde bg-superficie md:grid-cols-2">
      <Link href={`/blog/${a.slug}`} tabIndex={-1} aria-hidden="true">
        <Portada a={a} clase="aspect-[1200/630] md:h-full md:aspect-auto" />
      </Link>
      <div className="flex flex-col justify-center gap-3 p-6 md:p-10">
        <p className="font-mono text-xs font-semibold tracking-wider text-marca-fuerte uppercase">
          Destacado{a.categoria && ` · ${a.categoria.nombre}`}
        </p>
        <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance">
          <Link href={`/blog/${a.slug}`} className="hover:underline">
            {a.titulo}
          </Link>
        </h2>
        {a.resumen && <p className="text-lg text-texto-2">{a.resumen}</p>}
        <Meta a={a} />
      </div>
    </article>
  );
}

export function Grilla({ articulos, vacio }: { articulos: ArticuloTarjeta[]; vacio: string }) {
  if (!articulos.length)
    return <p className="rounded-2xl border border-dashed border-borde p-10 text-center text-texto-2">{vacio}</p>;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articulos.map((a) => (
        <Tarjeta key={a.slug} a={a} />
      ))}
    </div>
  );
}

export function Cargando() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse px-4 py-10">
      <div className="h-8 w-64 rounded bg-borde" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-2xl bg-borde" />
        ))}
      </div>
    </div>
  );
}
