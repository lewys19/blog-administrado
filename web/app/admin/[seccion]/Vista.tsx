"use client";

import { useParams } from "next/navigation";

import { Migas } from "@/components/panel/Panel";
import { SECCIONES } from "@/lib/secciones";

/** Secciones que todavía no están construidas: qué harán y en qué sprint llegan. */
export function Proximamente() {
  const { seccion } = useParams<{ seccion: string }>();
  const s = SECCIONES.find((x) => x.ruta === seccion);
  if (!s) return <p className="p-6 text-center text-texto-2">Esta sección no existe.</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <Migas items={[{ texto: s.texto }]} />
      <div className="rounded-2xl border border-dashed border-borde bg-superficie p-8 text-center">
        <p className="font-mono text-xs font-semibold tracking-widest text-aviso uppercase">Llega en el Sprint {s.sprint}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{s.texto}</h1>
        <p className="mx-auto mt-2 max-w-md text-texto-2">{s.descripcion}</p>
      </div>
    </div>
  );
}
