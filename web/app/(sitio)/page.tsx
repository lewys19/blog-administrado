import Link from "next/link";
import type { ReactNode } from "react";

import { Carrusel } from "@/components/blog/Carrusel";
import { MasLeidos, Newsletter, Paises, Publicidad, TagsPopulares } from "@/components/blog/Lateral";
import { Tarjeta } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import type { Cuenta, Etiqueta, MasLeido, PaginaArticulos } from "@/lib/tipos";

// Cada fila es: contenido a la izquierda + una caja a la derecha (como en el modelo).
const fila = "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]";

function Titulo({ children, href }: { children: ReactNode; href?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="border-l-4 border-marca pl-3 text-xl font-bold tracking-tight">{children}</h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-marca-fuerte hover:underline">
          Ver todos →
        </Link>
      )}
    </div>
  );
}

const MAX_DESTACADOS = 4;

export default async function Portada() {
  const [pagina, marcados, etiquetas, leidos, paises, mapa] = await Promise.all([
    obtener<PaginaArticulos>("/blog/articulos?por_pagina=8"),
    obtener<PaginaArticulos>(`/blog/articulos?destacado=true&por_pagina=${MAX_DESTACADOS}`),
    obtener<Etiqueta[]>("/blog/etiquetas"),
    obtener<MasLeido[]>("/blog/mas-leidos?limite=5"),
    obtener<Cuenta[]>("/blog/paises"),
    obtener<Cuenta[]>("/blog/paises/mapa"),
  ]);
  const ultimos = pagina?.articulos ?? [];
  const carrusel = ultimos.slice(0, 3); // lo más nuevo pasa arriba
  const destacados = marcados?.articulos ?? []; // solo lo marcado con «Destacado en la portada»

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-6">
      <h1 className="sr-only">zcorp-stack: tecnología, IA y programación</h1>

      <div className={fila}>
        {carrusel.length ? (
          <Carrusel articulos={carrusel} />
        ) : (
          <p className="rounded-2xl border border-dashed border-borde p-10 text-center text-texto-2">
            Muy pronto, los primeros artículos.
          </p>
        )}
        <aside className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1" aria-label="Boletín y anuncio">
          <Newsletter />
          <Publicidad />
        </aside>
      </div>

      {!!ultimos.length && (
        <div className={fila}>
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
            <div className="md:col-span-2 xl:col-span-2">
              {!!destacados.length && (
                <>
                  <Titulo>Artículos destacados</Titulo>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {destacados.map((a) => (
                      <Tarjeta key={a.slug} a={a} />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="md:col-span-2 xl:col-span-1 xl:pt-11">
              <MasLeidos articulos={leidos ?? []} />
            </div>
          </section>
          <aside className="lg:pt-11" aria-label="Etiquetas">
            <TagsPopulares etiquetas={etiquetas ?? []} limite={16} />
          </aside>
        </div>
      )}

      {!!ultimos.length && (
        <div className={fila}>
          <section>
            <Titulo href="/categorias">Últimos artículos</Titulo>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {ultimos.map((a) => (
                <Tarjeta key={a.slug} a={a} compacta />
              ))}
            </div>
          </section>
          <aside className="lg:pt-11" aria-label="Visitantes">
            <Paises cuentas={paises ?? []} mapa={mapa ?? []} />
          </aside>
        </div>
      )}
    </div>
  );
}
