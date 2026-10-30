"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Columnas } from "@/components/panel/Graficos";
import { Migas, puede, usePanel } from "@/components/panel/Panel";
import { pedir } from "@/lib/api";
import { cifra, duracion, variacion } from "@/lib/formato";
import { SECCIONES } from "@/lib/secciones";
import type { Resumen } from "@/lib/tipos";

interface Cifra {
  titulo: string;
  valor?: number;
  detalle?: string;
  sprint?: number; // aún no se mide: llega en ese sprint
}

function Tarjeta({ c, oscura = false }: { c: Cifra; oscura?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${oscura ? "bg-lateral text-white" : "border border-borde bg-superficie"}`}>
      <p className={`text-sm ${oscura ? "text-lateral-texto" : "text-texto-2"}`}>{c.titulo}</p>
      {c.valor !== undefined ? (
        <p className="mt-1 text-3xl font-bold tabular-nums">{cifra(c.valor)}</p>
      ) : (
        <p className="mt-1 text-3xl font-bold text-texto-2/50">—</p>
      )}
      <p className={`mt-1 text-xs ${c.sprint ? "font-mono text-aviso" : oscura ? "text-marca" : "text-marca-fuerte"}`}>
        {c.sprint ? `Se mide desde el Sprint ${c.sprint}` : c.detalle}
      </p>
    </div>
  );
}

export function Dashboard() {
  const yo = usePanel();
  const [r, setR] = useState<Resumen | null>(null);

  useEffect(() => {
    pedir<Resumen>("/panel/resumen", { conSesion: true })
      .then(setR)
      .catch(() => {});
  }, []);

  const v = r?.visitas;
  const verVisitas = puede(yo, "estadisticas.ver");
  const cambioMes = v ? variacion(v.mes, v.mes_anterior) : null;
  const cifras: Cifra[] = [
    ...(verVisitas
      ? [
          { titulo: "Visitas hoy", valor: v?.hoy, detalle: v ? `${cifra(v.lectores_hoy)} lectores únicos` : "" },
          {
            titulo: "Visitas del mes",
            valor: v?.mes,
            detalle: v ? (cambioMes ? `${cambioMes} frente al mes pasado a la misma fecha` : "Primer mes medido") : "",
          },
        ]
      : []),
    { titulo: "Ingresos de AdSense", sprint: 6 },
    {
      titulo: "Artículos publicados",
      valor: r?.articulos_publicados,
      detalle: r ? `${r.articulos_en_revision} en revisión` : "",
    },
    {
      titulo: "Usuarios registrados",
      valor: r?.usuarios,
      detalle: r ? `${r.usuarios_nuevos_7d} nuevos en 7 días` : "",
    },
    { titulo: "Comentarios pendientes", sprint: 3 },
  ];
  // Solo lo que este rol podrá usar (igual que la barra lateral).
  const proximas = SECCIONES.filter((s) => s.sprint && puede(yo, s.permiso)).sort(
    (a, b) => (a.sprint ?? 0) - (b.sprint ?? 0),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <Migas items={[]} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {yo.nombre.split(" ")[0]}</h1>
          <p className="text-sm text-texto-2">Resumen de zcorp-stack.</p>
        </div>
        <Link
          href="/admin/articulos/nuevo"
          className="rounded-full bg-lateral px-4 py-2 text-sm font-semibold text-white hover:bg-lateral-activo"
        >
          + Nuevo artículo
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cifras.map((c, i) => (
          <Tarjeta key={c.titulo} c={c} oscura={i === 0} />
        ))}
      </div>

      {verVisitas && (
        <section className="mt-6 rounded-2xl border border-borde bg-superficie p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold">Visitas de los últimos 12 meses</h2>
            <p className="text-sm text-texto-2">
              {v ? `Lectura promedio este mes: ${duracion(v.segundos_promedio_mes)} · ` : ""}
              <Link href="/admin/estadisticas" className="font-medium text-marca-fuerte hover:underline">
                Ver estadísticas →
              </Link>
            </p>
          </div>
          {v ? <Columnas puntos={v.por_mes} alto={180} /> : <div className="h-[220px] animate-pulse rounded-xl bg-fondo" />}
        </section>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-borde bg-superficie p-5 lg:col-span-2">
          <h2 className="font-bold">Lo que viene</h2>
          <p className="mb-3 text-sm text-texto-2">
            Secciones del panel por sprint. Cada una se activa cuando su sprint funciona.
          </p>
          <ul className="divide-y divide-borde text-sm">
            {proximas.map((s) => (
              <li key={s.ruta} className="flex items-center gap-3 py-2">
                <span className="w-12 font-mono text-xs font-semibold text-marca-fuerte">S{s.sprint}</span>
                <Link href={`/admin/${s.ruta}`} className="font-medium hover:underline">
                  {s.texto}
                </Link>
                <span className="hidden min-w-0 flex-1 truncate text-texto-2 sm:block">{s.descripcion}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="grid content-start gap-4">
          <Tarjeta c={{ titulo: "Usuarios activos hoy", valor: r?.usuarios_activos_hoy, detalle: "Ingresaron hoy" }} />
          <Tarjeta c={{ titulo: "Equipo editorial", valor: r?.equipo, detalle: "Cuentas con rol en el panel" }} />
        </div>
      </div>
    </div>
  );
}
