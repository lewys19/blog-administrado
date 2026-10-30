"use client";

// Gráficos del panel, hechos con HTML (sin librerías). Una sola serie y un solo color (el verde de la marca):
// el valor lo dice la altura o el largo, y el número siempre se puede leer al pasar el mouse o en la tabla.
import { type ReactNode, useState } from "react";

import { cifra, etiquetaFecha } from "@/lib/formato";
import type { Punto } from "@/lib/tipos";

/** Un tope "redondo" para el eje: 37 → 40, 1234 → 1500. */
function tope(maximo: number): number {
  if (maximo <= 4) return 4;
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  const paso = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((p) => p * magnitud >= maximo) ?? 10;
  return paso * magnitud;
}

/** Columnas de visitas por día o por mes, con el detalle de cada una al pasar el mouse o tocarla. */
export function Columnas({ puntos, alto = 220 }: { puntos: Punto[]; alto?: number }) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = tope(Math.max(0, ...puntos.map((p) => p.visitas)));
  // Pocas etiquetas abajo: una de cada `salto` para que no se encimen.
  const salto = puntos.length > 14 ? Math.ceil(puntos.length / 6) : 1;
  const corta = puntos.length > 7;
  const p = activo === null ? null : puntos[activo];
  const fraccion = activo === null ? 0 : (activo + 0.5) / puntos.length;

  return (
    <figure>
      <div className="relative" style={{ height: alto }}>
        {/* Líneas guía: tenues, detrás de las columnas. */}
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${f * 100}%` }}>
            <span className="w-8 shrink-0 -translate-y-1/2 text-right text-[11px] tabular-nums text-texto-2">
              {cifra(max * f)}
            </span>
            <span className={`h-px flex-1 ${f === 0 ? "bg-borde" : "bg-borde/60"}`} />
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-10 flex items-end gap-0.5" onMouseLeave={() => setActivo(null)}>
          {puntos.map((punto, i) => (
            <button
              key={punto.etiqueta}
              type="button"
              aria-label={`${etiquetaFecha(punto.etiqueta)}: ${cifra(punto.visitas)} visitas`}
              onMouseEnter={() => setActivo(i)}
              onFocus={() => setActivo(i)}
              onClick={() => setActivo(i)}
              className="group flex h-full min-w-0 flex-1 items-end outline-none"
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${
                  activo === i ? "bg-marca-fuerte" : "bg-marca group-focus-visible:bg-marca-fuerte"
                }`}
                style={{ height: `${(punto.visitas / max) * 100}%`, minHeight: punto.visitas ? 2 : 0 }}
              />
            </button>
          ))}
        </div>
        {p && activo !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-borde bg-superficie px-3 py-2 text-xs whitespace-nowrap shadow-lg"
            style={{
              left: `calc(2.5rem + (100% - 2.5rem) * ${(activo + 0.5) / puntos.length})`,
              // En los bordes, el globo se abre hacia adentro para no salirse del gráfico.
              transform: `translateX(${fraccion < 0.2 ? "0" : fraccion > 0.8 ? "-100%" : "-50%"})`,
            }}
          >
            <p className="font-semibold">{etiquetaFecha(p.etiqueta)}</p>
            <p className="tabular-nums">{cifra(p.visitas)} visitas</p>
            <p className="tabular-nums text-texto-2">{cifra(p.lectores)} lectores</p>
          </div>
        )}
      </div>
      <div className="ml-10 mt-1.5 flex gap-0.5 text-[11px] text-texto-2">
        {puntos.map((punto, i) => (
          <span key={punto.etiqueta} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
            {i % salto === 0 ? etiquetaFecha(punto.etiqueta, corta) : ""}
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-texto-2 hover:text-texto">Ver como tabla</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-texto-2">
            <tr>
              <th className="py-1 font-medium">Fecha</th>
              <th className="py-1 text-right font-medium">Visitas</th>
              <th className="py-1 text-right font-medium">Lectores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {puntos.map((punto) => (
              <tr key={punto.etiqueta}>
                <td className="py-1">{etiquetaFecha(punto.etiqueta)}</td>
                <td className="py-1 text-right">{cifra(punto.visitas)}</td>
                <td className="py-1 text-right">{cifra(punto.lectores)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export interface Fila {
  clave: string;
  texto: ReactNode;
  valor: number;
  detalle?: string; // a la derecha, después del porcentaje
}

/** Ranking con barras horizontales: países, de dónde llegan, dispositivos. */
export function Barras({ filas, total, vacio = "Aún no hay datos." }: { filas: Fila[]; total: number; vacio?: string }) {
  if (!filas.length) return <p className="py-6 text-center text-sm text-texto-2">{vacio}</p>;
  const max = Math.max(...filas.map((f) => f.valor));
  return (
    <ul className="space-y-3">
      {filas.map((f) => (
        <li key={f.clave} title={`${cifra(f.valor)} visitas`}>
          <div className="mb-1 flex items-baseline gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{f.texto}</span>
            <span className="font-semibold tabular-nums">{cifra(f.valor)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-texto-2">
              {total ? Math.round((f.valor / total) * 100) : 0}%
            </span>
            {f.detalle && <span className="text-xs text-texto-2">{f.detalle}</span>}
          </div>
          <div className="h-2 rounded-full bg-marca-suave">
            <div className="h-full rounded-full bg-marca" style={{ width: `${(f.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
