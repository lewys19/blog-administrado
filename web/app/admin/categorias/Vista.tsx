"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Migas, puede, usePanel } from "@/components/panel/Panel";
import { Aviso, BotonAccion, Caja, GrupoAcciones, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import type { Categoria } from "@/lib/tipos";

const ENTRADA = "w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca";

interface Borrador {
  id: number | null;
  nombre: string;
  descripcion: string;
  padre_id: string;
  orden: string;
}

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

export function Categorias() {
  const yo = usePanel();
  const gestiona = puede(yo, "categorias.gestionar");
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [porEliminar, setPorEliminar] = useState<Categoria | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    pedir<Categoria[]>("/panel/categorias", { conSesion: true })
      .then(setCategorias)
      .catch((e) => setError(mensaje(e, "No se pudieron cargar las categorías.")));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const principales = (categorias ?? []).filter((c) => c.padre_id === null && c.id !== borrador?.id);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!borrador) return;
    setOk(null);
    setError(null);
    try {
      await pedir(borrador.id ? `/panel/categorias/${borrador.id}` : "/panel/categorias", {
        metodo: borrador.id ? "PUT" : "POST",
        conSesion: true,
        cuerpo: {
          nombre: borrador.nombre,
          descripcion: borrador.descripcion || null,
          padre_id: borrador.padre_id ? Number(borrador.padre_id) : null,
          orden: Number(borrador.orden) || 0,
        },
      });
      setOk(borrador.id ? `Se guardó «${borrador.nombre}».` : `Se creó «${borrador.nombre}». Ya aparece en el blog.`);
      setBorrador(null);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo guardar."));
    }
  }

  async function eliminar(c: Categoria) {
    setPorEliminar(null);
    setOk(null);
    setError(null);
    try {
      await pedir(`/panel/categorias/${c.id}`, { metodo: "DELETE", conSesion: true });
      setOk(`Se eliminó «${c.nombre}».`);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo eliminar."));
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Migas items={[{ texto: "Categorías" }]} />
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold tracking-tight">Categorías</h1>
        {gestiona && (
          <button
            type="button"
            onClick={() => {
              setOk(null);
              const siguiente = Math.max(0, ...(categorias ?? []).map((c) => c.orden)) + 1;
              setBorrador({ id: null, nombre: "", descripcion: "", padre_id: "", orden: String(siguiente) });
            }}
            className="rounded-lg bg-lateral px-4 py-2 text-sm font-semibold text-white hover:bg-lateral-activo"
          >
            + Nueva categoría
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-texto-2">
        Dos niveles: una categoría puede ir dentro de otra (Programación › Docker). La URL no cambia al renombrar.
      </p>
      <div className="mb-3 space-y-2">
        <Aviso ok={ok} error={error} />
        {porEliminar && (
          <div
            role="alertdialog"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm"
          >
            <span className="flex-1">¿Eliminar la categoría «{porEliminar.nombre}»?</span>
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
      {borrador && (
        <form onSubmit={guardar} className="mb-6">
          <Caja className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-texto-2">Nombre</span>
              <input
                id="categoria-nombre"
                className={ENTRADA}
                required
                minLength={2}
                maxLength={60}
                value={borrador.nombre}
                onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-texto-2">Va dentro de</span>
              <select
                id="categoria-padre"
                className={ENTRADA}
                value={borrador.padre_id}
                onChange={(e) => setBorrador({ ...borrador, padre_id: e.target.value })}
              >
                <option value="">— Es principal —</option>
                {principales.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-texto-2">Descripción (sale en su página y en Google)</span>
              <input
                id="categoria-descripcion"
                className={ENTRADA}
                maxLength={300}
                value={borrador.descripcion}
                onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-texto-2">Orden (menor = antes)</span>
              <input
                id="categoria-orden"
                type="number"
                min={0}
                max={999}
                className={`${ENTRADA} w-28`}
                value={borrador.orden}
                onChange={(e) => setBorrador({ ...borrador, orden: e.target.value })}
              />
            </label>
            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={() => setBorrador(null)}
                className="rounded-md border border-borde px-3 py-2 text-sm"
              >
                Cancelar
              </button>
              <button type="submit" className="rounded-md bg-marca px-4 py-2 text-sm font-semibold text-sobre-marca">
                Guardar categoría
              </button>
            </div>
          </Caja>
        </form>
      )}
      <Caja>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-lateral text-lateral-texto">
              <tr>
                <th className={TH}>Categoría</th>
                <th className={TH}>URL</th>
                <th className={`${TH} text-center`}>Publicados</th>
                {gestiona && <th className={TH}>Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {(categorias ?? []).map((c) => (
                <tr key={c.id} className={c.padre_id ? "" : "bg-fondo/50"}>
                  <td className={`${TD} ${c.padre_id ? "pl-10" : "font-semibold"}`}>{c.nombre}</td>
                  <td className={`${TD} font-mono text-xs text-texto-2`}>/categoria/{c.slug}</td>
                  <td className={`${TD} text-center tabular-nums`}>{c.articulos}</td>
                  {gestiona && (
                    <td className={TD}>
                      <GrupoAcciones>
                        <BotonAccion
                          tipo="editar"
                          titulo="Editar"
                          onClick={() =>
                            setBorrador({
                              id: c.id,
                              nombre: c.nombre,
                              descripcion: c.descripcion ?? "",
                              padre_id: c.padre_id ? String(c.padre_id) : "",
                              orden: String(c.orden),
                            })
                          }
                        />
                        <BotonAccion tipo="eliminar" titulo="Eliminar" onClick={() => setPorEliminar(c)} />
                      </GrupoAcciones>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Caja>
    </div>
  );
}
