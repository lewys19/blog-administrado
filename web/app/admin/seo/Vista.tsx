"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";
import { Caja, TD, TH } from "@/components/panel/Tabla";
import { pedir } from "@/lib/api";
import type { PaginaArticulosPanel } from "@/lib/tipos";

/** Salud del SEO: qué artículos publicados todavía no tienen resumen o meta descripción. */
export function Seo() {
  const yo = usePanel();
  const [datos, setDatos] = useState<PaginaArticulosPanel | null>(null);

  useEffect(() => {
    if (puede(yo, "seo.gestionar")) {
      pedir<PaginaArticulosPanel>("/panel/articulos?estado=publicado&por_pagina=100", { conSesion: true })
        .then(setDatos)
        .catch(() => {});
    }
  }, [yo]);

  if (!puede(yo, "seo.gestionar")) return <SinPermiso />;
  const pendientes = datos?.articulos.filter((a) => !a.seo_completo) ?? [];
  const completos = (datos?.articulos.length ?? 0) - pendientes.length;

  return (
    <div className="mx-auto max-w-5xl">
      <Migas items={[{ texto: "SEO" }]} />
      <h1 className="mb-2 text-2xl font-bold tracking-tight">SEO</h1>
      <p className="mb-6 text-sm text-texto-2">
        Cada artículo publicado ya sale con su meta título, OpenGraph para redes, datos estructurados (Schema.org) y
        entra al{" "}
        <a href="/sitemap.xml" target="_blank" className="text-marca-fuerte underline">
          sitemap
        </a>{" "}
        y al{" "}
        <a href="/rss.xml" target="_blank" className="text-marca-fuerte underline">
          RSS
        </a>
        . Lo que falta completar a mano es el resumen y la meta descripción.
      </p>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-borde bg-superficie p-5">
          <p className="text-sm text-texto-2">SEO completo</p>
          <p className="text-3xl font-bold text-marca-fuerte tabular-nums">{datos ? completos : "—"}</p>
        </div>
        <div className="rounded-2xl border border-borde bg-superficie p-5">
          <p className="text-sm text-texto-2">Por completar</p>
          <p className="text-3xl font-bold text-aviso tabular-nums">{datos ? pendientes.length : "—"}</p>
        </div>
      </div>
      <Caja>
        <table className="w-full text-sm">
          <thead className="bg-lateral text-lateral-texto">
            <tr>
              <th className={TH}>Artículo publicado sin SEO completo</th>
              <th className={TH}>Autor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {pendientes.length === 0 ? (
              <tr>
                <td colSpan={2} className={`${TD} text-center text-texto-2`}>
                  {datos ? "Todo en orden: ningún artículo publicado tiene SEO pendiente." : "Cargando…"}
                </td>
              </tr>
            ) : (
              pendientes.map((a) => (
                <tr key={a.id}>
                  <td className={TD}>
                    <Link href={`/admin/articulos/${a.id}`} className="font-medium hover:underline">
                      {a.titulo}
                    </Link>
                  </td>
                  <td className={TD}>@{a.autor.username}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Caja>
    </div>
  );
}
