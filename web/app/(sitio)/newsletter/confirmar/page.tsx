import type { Metadata } from "next";
import { Suspense } from "react";

import { AccionBoletin } from "@/components/blog/AccionBoletin";

export const metadata: Metadata = { title: "Confirmar suscripción", robots: { index: false } };

export default function Pagina() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="rounded-2xl border border-borde bg-pagina p-8 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">Confirmar suscripción</h1>
        {/* El código del enlace llega en la dirección (?token=…): solo se lee en el navegador. */}
        <Suspense fallback={<p className="text-texto-2">Un momento…</p>}>
          <AccionBoletin accion="confirmar" />
        </Suspense>
      </div>
    </div>
  );
}
