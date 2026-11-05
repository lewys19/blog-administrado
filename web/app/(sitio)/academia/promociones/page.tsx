import type { Metadata } from "next";

import { ICONOS, Icono } from "@/components/blog/Iconos";
import { Migas } from "@/components/blog/Lateral";
import { enlacePromocion, precioTexto } from "@/lib/academia";
import { obtener } from "@/lib/servidor";
import { WHATSAPP_ACADEMIA } from "@/lib/sitio";
import type { Promocion } from "@/lib/tipos";

export const metadata: Metadata = {
  title: "Promociones",
  description: "Packs y ofertas especiales de la Academia Digital.",
  alternates: { canonical: "/academia/promociones" },
};

export default async function Promociones() {
  const promociones = (await obtener<Promocion[]>("/academia/promociones")) ?? [];
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <Migas items={[{ texto: "Academia Digital", href: "/academia" }, { texto: "Promociones" }]} />
      <h1 className="mt-4 mb-6 text-3xl font-bold tracking-tight">Promociones</h1>
      {promociones.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {promociones.map((p) => (
            <article key={p.id} className="flex flex-col gap-4 rounded-2xl bg-lateral p-6 text-white shadow-sm">
              <p className="w-fit rounded-md bg-marca px-2 py-0.5 text-xs font-semibold">Oferta especial</p>
              <h2 className="text-2xl font-bold text-balance">{p.titulo}</h2>
              {!!p.detalle.length && (
                <ul className="space-y-1.5 text-sm text-lateral-texto">
                  {p.detalle.map((linea, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Icono d={ICONOS.check} className="h-4 w-4 text-[#6fe0a2]" /> {linea}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto space-y-3 pt-1">
                <p className="flex items-baseline gap-2">
                  {p.precio_anterior !== null && (
                    <s className="text-lg text-lateral-texto">
                      <span className="sr-only">Antes: </span>
                      {precioTexto(p.precio_anterior)}
                    </s>
                  )}
                  <span className="text-4xl font-bold text-[#6fe0a2]">
                    <span className="sr-only">Ahora: </span>
                    {precioTexto(p.precio)}
                  </span>
                </p>
                <a
                  href={enlacePromocion(WHATSAPP_ACADEMIA, p)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg bg-marca px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-fuerte"
                >
                  <Icono d={ICONOS.whatsapp} className="h-4 w-4" /> Comprar por WhatsApp
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-borde p-8 text-center text-texto-2">
          Muy pronto habrá promociones aquí.
        </p>
      )}
    </div>
  );
}
