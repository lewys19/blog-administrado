"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/blog/Lateral";
import { ICONOS, Icono } from "@/components/blog/Iconos";
import { fechaLarga } from "@/lib/formato";
import type { ArticuloTarjeta } from "@/lib/tipos";
import { rutaArticulo } from "@/lib/rutas";

const PAUSA = 7000;

/** El gran recuadro de la portada: los destacados pasan solos (se detiene al pasar el mouse). */
export function Carrusel({ articulos }: { articulos: ArticuloTarjeta[] }) {
  const [actual, setActual] = useState(0);
  const [quieto, setQuieto] = useState(false);
  const total = articulos.length;

  useEffect(() => {
    if (total < 2 || quieto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setActual((i) => (i + 1) % total), PAUSA);
    return () => clearTimeout(t);
  }, [actual, quieto, total]);

  const ir = (i: number) => setActual((i + total) % total);

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Artículos destacados"
      className="relative min-h-[360px] overflow-hidden rounded-2xl bg-lateral shadow-sm md:min-h-[400px]"
      onMouseEnter={() => setQuieto(true)}
      onMouseLeave={() => setQuieto(false)}
      onFocus={() => setQuieto(true)}
      onBlur={() => setQuieto(false)}
    >
      {articulos.map((a, i) => (
        <article
          key={a.slug}
          aria-hidden={i !== actual}
          className={`absolute inset-0 transition-opacity duration-700 ${i === actual ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {a.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.imagen} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-lateral via-lateral-activo to-marca-fuerte" />
          )}
          {/* Degradado para que el texto blanco se lea sobre cualquier foto. */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/10" />
          <div className="relative flex h-full max-w-xl flex-col justify-center gap-3 p-6 text-white md:p-10">
            {a.categoria && (
              <Link
                href={`/categoria/${a.categoria.slug}`}
                tabIndex={i === actual ? undefined : -1}
                className="w-fit rounded-md bg-marca px-2.5 py-1 text-xs font-semibold hover:bg-marca-fuerte"
              >
                {a.categoria.nombre}
              </Link>
            )}
            <h2 className="text-2xl leading-tight font-bold text-balance md:text-4xl">
              <Link href={rutaArticulo(a)} tabIndex={i === actual ? undefined : -1} className="hover:underline">
                {a.titulo}
              </Link>
            </h2>
            {a.resumen && <p className="line-clamp-3 text-sm text-white/85 md:text-base">{a.resumen}</p>}
            <div className="mt-2 flex items-center gap-3 text-xs text-white/80">
              <Avatar nombre={a.autor.nombre} className="h-9 w-9 text-sm" />
              <span>
                <span className="block text-sm font-semibold text-white">{a.autor.nombre}</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Icono d={ICONOS.calendario} className="h-3.5 w-3.5" />
                    {fechaLarga(a.publicado_en)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icono d={ICONOS.reloj} className="h-3.5 w-3.5" />
                    {a.minutos_lectura} min
                  </span>
                </span>
              </span>
            </div>
          </div>
        </article>
      ))}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => ir(actual - 1)}
            aria-label="Anterior"
            className="absolute top-1/2 left-3 hidden -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/30 md:block"
          >
            <Icono d={ICONOS.izquierda} />
          </button>
          <button
            type="button"
            onClick={() => ir(actual + 1)}
            aria-label="Siguiente"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/30"
          >
            <Icono d={ICONOS.derecha} />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {articulos.map((a, i) => (
              <button
                key={a.slug}
                type="button"
                onClick={() => ir(i)}
                aria-label={`Ver destacado ${i + 1}`}
                aria-current={i === actual}
                className={`h-2 rounded-full transition-all ${i === actual ? "w-6 bg-marca" : "w-2 bg-white/60 hover:bg-white"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
