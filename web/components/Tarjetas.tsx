import Link from "next/link";

import { ICONOS, Icono } from "@/components/blog/Iconos";
import { fechaCorta, fechaLarga } from "@/lib/formato";
import type { ArticuloTarjeta } from "@/lib/tipos";
import { rutaArticulo } from "@/lib/rutas";

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

function EtiquetaCategoria({ a }: { a: ArticuloTarjeta }) {
  if (!a.categoria) return null;
  return (
    <Link
      href={`/categoria/${a.categoria.slug}`}
      className="relative z-10 w-fit rounded-md bg-marca-suave px-2 py-0.5 text-xs font-semibold text-marca-fuerte hover:bg-marca hover:text-white"
    >
      {a.categoria.nombre}
    </Link>
  );
}

export function Meta({ a }: { a: ArticuloTarjeta }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-texto-2">
      <Link
        href={`/autores/${a.autor.username}`}
        className="relative z-10 font-semibold text-texto hover:text-marca-fuerte"
      >
        {a.autor.nombre}
      </Link>
      <span className="flex items-center gap-1">
        <Icono d={ICONOS.calendario} className="h-3.5 w-3.5" />
        <time dateTime={a.publicado_en}>{fechaLarga(a.publicado_en)}</time>
      </span>
      <span className="flex items-center gap-1">
        <Icono d={ICONOS.reloj} className="h-3.5 w-3.5" /> {a.minutos_lectura} min
      </span>
    </p>
  );
}

/** Tarjeta de artículo. `compacta`: para filas de 4 (sin resumen ni autor, título más chico). */
export function Tarjeta({ a, compacta = false }: { a: ArticuloTarjeta; compacta?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-borde bg-pagina shadow-sm transition hover:-translate-y-0.5 hover:border-marca hover:shadow-md">
      <Portada a={a} clase="aspect-[1200/630]" />
      <div className={`flex flex-1 flex-col ${compacta ? "gap-2 p-3.5" : "gap-2.5 p-5"}`}>
        <EtiquetaCategoria a={a} />
        <h3 className={`leading-snug font-bold text-balance ${compacta ? "line-clamp-3 text-sm" : "text-lg"}`}>
          {/* Toda la tarjeta es el enlace al artículo. */}
          <Link href={rutaArticulo(a)} className="after:absolute after:inset-0 group-hover:text-marca-fuerte">
            {a.titulo}
          </Link>
        </h3>
        {!compacta && a.resumen && <p className="line-clamp-2 text-sm text-texto-2">{a.resumen}</p>}
        <div className="mt-auto pt-1">
          {compacta ? (
            <p className="flex items-center gap-3 text-xs whitespace-nowrap text-texto-2">
              <time dateTime={a.publicado_en}>{fechaCorta(a.publicado_en)}</time>
              <span className="flex items-center gap-1">
                <Icono d={ICONOS.reloj} className="h-3.5 w-3.5" /> {a.minutos_lectura} min
              </span>
            </p>
          ) : (
            <Meta a={a} />
          )}
        </div>
      </div>
    </article>
  );
}

/** El artículo destacado de la portada: grande, imagen al lado. */
export function Destacado({ a }: { a: ArticuloTarjeta }) {
  return (
    <article className="group relative grid overflow-hidden rounded-3xl border border-borde bg-pagina shadow-sm md:grid-cols-2">
      <Portada a={a} clase="aspect-[1200/630] md:h-full md:aspect-auto" />
      <div className="flex flex-col justify-center gap-3 p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-marca px-2 py-0.5 text-xs font-semibold text-white">Destacado</span>
          <EtiquetaCategoria a={a} />
        </div>
        <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance">
          <Link href={rutaArticulo(a)} className="after:absolute after:inset-0 group-hover:text-marca-fuerte">
            {a.titulo}
          </Link>
        </h2>
        {a.resumen && <p className="text-lg text-texto-2">{a.resumen}</p>}
        <Meta a={a} />
        <span className="mt-2 w-fit rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white group-hover:bg-marca-fuerte">
          Leer artículo →
        </span>
      </div>
    </article>
  );
}

export function Grilla({
  articulos,
  vacio,
  columnas = 3,
}: {
  articulos: ArticuloTarjeta[];
  vacio: string;
  columnas?: 2 | 3;
}) {
  if (!articulos.length)
    return <p className="rounded-2xl border border-dashed border-borde p-10 text-center text-texto-2">{vacio}</p>;
  return (
    <div className={`grid gap-6 sm:grid-cols-2 ${columnas === 3 ? "lg:grid-cols-3" : ""}`}>
      {articulos.map((a) => (
        <Tarjeta key={a.slug} a={a} />
      ))}
    </div>
  );
}

export function Cargando() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-4 py-10">
      <div className="h-8 w-64 rounded bg-borde" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-2xl bg-borde" />
        ))}
      </div>
    </div>
  );
}
