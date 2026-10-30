"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { Barras, Columnas } from "@/components/panel/Graficos";
import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";
import { pedir } from "@/lib/api";
import { cifra, duracion, fecha, pais, variacion } from "@/lib/formato";
import type { Estadisticas, Periodo } from "@/lib/tipos";

const PERIODOS: { valor: Periodo; texto: string; anterior: string }[] = [
  { valor: "7d", texto: "7 días", anterior: "los 7 días anteriores" },
  { valor: "30d", texto: "30 días", anterior: "los 30 días anteriores" },
  { valor: "12m", texto: "12 meses", anterior: "los 12 meses anteriores" },
];

const ORIGENES: Record<string, string> = {
  directo: "Directo",
  buscador: "Buscadores (Google, Bing…)",
  redes: "Redes sociales",
  ia: "Asistentes de IA (ChatGPT, Gemini…)",
  otros: "Otros sitios web",
};
const DISPOSITIVOS: Record<string, string> = { escritorio: "Computadora", movil: "Celular", tablet: "Tablet" };

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <p className="text-sm text-texto-2">{titulo}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-texto-2">{detalle}</p>}
    </div>
  );
}

function Caja({ titulo, children, className = "" }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-borde bg-superficie p-5 ${className}`}>
      <h2 className="mb-4 font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

export function EstadisticasVista() {
  const yo = usePanel();
  const permitido = puede(yo, "estadisticas.ver");
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!permitido) return;
    let vigente = true;
    pedir<Estadisticas>(`/panel/estadisticas?periodo=${periodo}`, { conSesion: true })
      .then((d) => vigente && (setDatos(d), setError(false)))
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
    };
  }, [periodo, permitido]);

  if (!permitido) return <SinPermiso />;
  const d = datos?.periodo === periodo ? datos : null;
  const t = d?.totales;
  const cambio = t ? variacion(t.visitas, t.visitas_anterior) : null;
  const anterior = PERIODOS.find((p) => p.valor === periodo)?.anterior;

  return (
    <div className="mx-auto max-w-6xl">
      <Migas items={[{ texto: "Estadísticas" }]} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-sm text-texto-2">
            {d ? `Del ${fecha(`${d.desde}T12:00:00`)} al ${fecha(`${d.hasta}T12:00:00`)}` : "Visitas del blog"} · sin
            cookies, sin robots y sin contar al equipo del panel.
          </p>
        </div>
        <div role="group" aria-label="Periodo" className="flex rounded-full border border-borde bg-superficie p-1 text-sm">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              onClick={() => setPeriodo(p.valor)}
              aria-pressed={periodo === p.valor}
              className={`rounded-full px-3.5 py-1.5 ${
                periodo === p.valor ? "bg-lateral font-semibold text-white" : "text-texto-2 hover:text-texto"
              }`}
            >
              {p.texto}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          No se pudieron cargar las estadísticas. Recarga la página.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra
          titulo="Visitas"
          valor={t ? cifra(t.visitas) : "—"}
          detalle={t ? (cambio ? `${cambio} frente a ${anterior}` : `Nada con qué comparar en ${anterior}`) : undefined}
        />
        <Cifra titulo="Lectores únicos" valor={t ? cifra(t.lectores) : "—"} detalle="Personas distintas de cada día" />
        <Cifra
          titulo="Tiempo de lectura"
          valor={t ? duracion(t.segundos_promedio) : "—"}
          detalle="Promedio por artículo, con la página a la vista"
        />
        <Cifra
          titulo="Hasta dónde leen"
          valor={t ? `${t.profundidad_promedio}%` : "—"}
          detalle="Cuánto bajan en el artículo, en promedio"
        />
      </div>

      <Caja titulo={periodo === "12m" ? "Visitas por mes" : "Visitas por día"} className="mt-4">
        {d ? <Columnas puntos={d.serie} /> : <div className="h-[260px] animate-pulse rounded-xl bg-fondo" />}
      </Caja>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Caja titulo="Artículos más leídos" className="lg:col-span-2">
          {d && d.articulos.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-texto-2">
                  <tr className="border-b border-borde">
                    <th className="py-2 pr-3 font-medium">Artículo</th>
                    <th className="py-2 px-3 text-right font-medium">Visitas</th>
                    <th className="py-2 px-3 text-right font-medium">Lectura</th>
                    <th className="py-2 pl-3 text-right font-medium">Bajan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde tabular-nums">
                  {d.articulos.map((a, i) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-3">
                        <span className="mr-2 text-texto-2">{i + 1}.</span>
                        <Link href={`/admin/articulos/${a.id}`} className="font-medium hover:underline">
                          {a.titulo}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">{cifra(a.visitas)}</td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">{duracion(a.segundos_promedio)}</td>
                      <td className="py-2 pl-3 text-right">{a.profundidad_promedio}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-texto-2">{d ? "Aún nadie leyó artículos en este periodo." : "Cargando…"}</p>
          )}
        </Caja>
        <Caja titulo="Países">
          <Barras
            total={t?.visitas ?? 0}
            filas={(d?.paises ?? []).map((c) => ({ clave: c.clave ?? "?", texto: pais(c.clave), valor: c.visitas }))}
          />
        </Caja>
        <Caja titulo="De dónde llegan">
          <Barras
            total={t?.visitas ?? 0}
            filas={(d?.origenes ?? []).map((c) => ({
              clave: c.clave ?? "?",
              texto: ORIGENES[c.clave ?? ""] ?? c.clave,
              valor: c.visitas,
            }))}
          />
        </Caja>
        <Caja titulo="Sitios que te enlazan">
          <Barras
            total={t?.visitas ?? 0}
            vacio="Todavía no llegó nadie desde otro sitio."
            filas={(d?.referentes ?? []).map((c) => ({ clave: c.clave ?? "?", texto: c.clave, valor: c.visitas }))}
          />
        </Caja>
        <Caja titulo="Dispositivos">
          <Barras
            total={t?.visitas ?? 0}
            filas={(d?.dispositivos ?? []).map((c) => ({
              clave: c.clave ?? "?",
              texto: DISPOSITIVOS[c.clave ?? ""] ?? c.clave,
              valor: c.visitas,
            }))}
          />
        </Caja>
      </div>
      <p className="mt-6 text-center text-xs text-texto-2">
        País de las visitas con la base gratuita de{" "}
        <a href="https://db-ip.com" target="_blank" rel="noreferrer" className="underline">
          DB-IP
        </a>
        .
      </p>
    </div>
  );
}
