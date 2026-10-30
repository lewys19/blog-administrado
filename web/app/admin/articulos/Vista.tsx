"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";
import { Aviso, BotonAccion, Caja, GrupoAcciones, Paginacion, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import { hace } from "@/lib/formato";
import type { ArticuloFila, EstadoArticulo, PaginaArticulosPanel } from "@/lib/tipos";

const ESTADOS: { valor: EstadoArticulo | ""; texto: string }[] = [
  { valor: "", texto: "Todos" },
  { valor: "borrador", texto: "Borradores" },
  { valor: "revision", texto: "En revisión" },
  { valor: "programado", texto: "Programados" },
  { valor: "publicado", texto: "Publicados" },
];

const COLOR: Record<EstadoArticulo, string> = {
  borrador: "bg-fondo text-texto-2 ring-1 ring-borde",
  revision: "bg-aviso/15 text-aviso",
  programado: "bg-lateral/10 text-lateral dark:text-lateral-texto",
  publicado: "bg-marca-suave text-marca-fuerte",
};

export function Articulos() {
  const yo = usePanel();
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoArticulo | "">("");
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaArticulosPanel | null>(null);
  const [porEliminar, setPorEliminar] = useState<ArticuloFila | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const espera = setTimeout(() => {
      setQ(texto.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(espera);
  }, [texto]);

  const cargar = useCallback(() => {
    const p = new URLSearchParams({ pagina: String(pagina), por_pagina: "20" });
    if (estado) p.set("estado", estado);
    if (q) p.set("q", q);
    pedir<PaginaArticulosPanel>(`/panel/articulos?${p}`, { conSesion: true })
      .then((d) => (setDatos(d), setError(null)))
      .catch((e) => setError(e instanceof ErrorApi ? e.message : "No se pudo cargar la lista."));
  }, [estado, q, pagina]);

  useEffect(() => {
    if (puede(yo, "articulos.escribir")) cargar();
  }, [yo, cargar]);

  if (!puede(yo, "articulos.escribir")) return <SinPermiso />;

  async function eliminar(a: ArticuloFila) {
    setPorEliminar(null);
    try {
      await pedir(`/panel/articulos/${a.id}`, { metodo: "DELETE", conSesion: true });
      setOk(`Se eliminó «${a.titulo}».`);
      cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Migas items={[{ texto: "Artículos" }]} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold tracking-tight">Artículos</h1>
        <Link
          href="/admin/articulos/nuevo"
          className="rounded-lg bg-lateral px-4 py-2 text-sm font-semibold text-white hover:bg-lateral-activo"
        >
          + Nuevo artículo
        </Link>
      </div>
      {!puede(yo, "articulos.editar_todos") && <p className="mb-3 text-sm text-texto-2">Ves solo tus artículos.</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" className="flex flex-wrap rounded-lg border border-borde bg-superficie p-1 text-sm">
          {ESTADOS.map((e) => (
            <button
              key={e.valor}
              type="button"
              role="tab"
              aria-selected={estado === e.valor}
              onClick={() => {
                setEstado(e.valor);
                setPagina(1);
              }}
              className={`rounded-md px-3 py-1.5 ${estado === e.valor ? "bg-lateral font-semibold text-white" : "text-texto-2 hover:text-texto"}`}
            >
              {e.texto}
            </button>
          ))}
        </div>
        <input
          id="buscar-articulos"
          type="search"
          aria-label="Buscar por título"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por título"
          className="min-w-0 flex-1 rounded-lg border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca sm:max-w-xs"
        />
      </div>

      <div className="mb-3 space-y-2">
        <Aviso ok={ok} error={error} />
        {porEliminar && (
          <div
            role="alertdialog"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm"
          >
            <span className="flex-1">
              ¿Eliminar <strong>«{porEliminar.titulo}»</strong>? No se puede deshacer.
            </span>
            <button
              type="button"
              onClick={() => setPorEliminar(null)}
              className="rounded-md border border-borde px-3 py-1.5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => eliminar(porEliminar)}
              className="rounded-md bg-error px-3 py-1.5 font-semibold text-white"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      <Caja>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-lateral text-lateral-texto">
              <tr>
                <th className={TH}>Título</th>
                <th className={TH}>Estado</th>
                <th className={TH}>Categoría</th>
                <th className={TH}>Autor</th>
                <th className={TH}>SEO</th>
                <th className={TH}>Actualizado</th>
                <th className={TH}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {datos === null ? (
                <tr>
                  <td colSpan={7} className={`${TD} text-center text-texto-2`}>
                    Cargando…
                  </td>
                </tr>
              ) : datos.articulos.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${TD} text-center text-texto-2`}>
                    {q || estado ? "Ningún artículo coincide." : "Todavía no hay artículos. Escribe el primero."}
                  </td>
                </tr>
              ) : (
                datos.articulos.map((a) => (
                  <tr key={a.id} className="odd:bg-fondo/50">
                    <td className={TD}>
                      <Link href={`/admin/articulos/${a.id}`} className="font-medium hover:underline">
                        {a.titulo}
                      </Link>
                      {a.destacado && <span className="ml-2 text-xs text-marca-fuerte">★ destacado</span>}
                    </td>
                    <td className={TD}>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR[a.estado]}`}>
                        {a.estado}
                      </span>
                    </td>
                    <td className={TD}>{a.categoria?.nombre ?? "—"}</td>
                    <td className={TD}>@{a.autor.username}</td>
                    <td className={TD}>
                      {a.seo_completo ? (
                        <span className="text-marca-fuerte">✓ completo</span>
                      ) : (
                        <span className="text-aviso" title="Falta el resumen o la meta descripción">
                          ! falta
                        </span>
                      )}
                    </td>
                    <td className={`${TD} text-texto-2`}>{hace(a.actualizado_en)}</td>
                    <td className={TD}>
                      <GrupoAcciones>
                        <BotonAccion
                          tipo="editar"
                          titulo="Editar"
                          onClick={() => router.push(`/admin/articulos/${a.id}`)}
                        />
                        <BotonAccion tipo="eliminar" titulo="Eliminar" onClick={() => setPorEliminar(a)} />
                      </GrupoAcciones>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {datos && (
          <Paginacion pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} alCambiar={setPagina} />
        )}
      </Caja>
    </div>
  );
}
