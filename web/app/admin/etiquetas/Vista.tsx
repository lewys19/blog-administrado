"use client";

import { useCallback, useEffect, useState } from "react";

import { Migas, puede, usePanel } from "@/components/panel/Panel";
import { Aviso, BotonAccion, Caja, GrupoAcciones, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import type { Etiqueta } from "@/lib/tipos";

export function Etiquetas() {
  const yo = usePanel();
  const gestiona = puede(yo, "categorias.gestionar");
  const [etiquetas, setEtiquetas] = useState<Etiqueta[] | null>(null);
  const [editando, setEditando] = useState<{ id: number; nombre: string } | null>(null);
  const [porEliminar, setPorEliminar] = useState<Etiqueta | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    pedir<Etiqueta[]>("/panel/etiquetas", { conSesion: true })
      .then(setEtiquetas)
      .catch(() => setError("No se pudieron cargar las etiquetas."));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function hacer(accion: () => Promise<unknown>, exito: string) {
    setOk(null);
    setError(null);
    try {
      await accion();
      setOk(exito);
      cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Migas items={[{ texto: "Etiquetas" }]} />
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Etiquetas</h1>
      <p className="mb-4 text-sm text-texto-2">
        Se crean solas al escribirlas en un artículo. Aquí se renombran o se eliminan (los artículos no se tocan).
      </p>
      <div className="mb-3 space-y-2">
        <Aviso ok={ok} error={error} />
        {porEliminar && (
          <div
            role="alertdialog"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm"
          >
            <span className="flex-1">¿Eliminar #{porEliminar.nombre}? Se quitará de los artículos que la tienen.</span>
            <button
              type="button"
              onClick={() => setPorEliminar(null)}
              className="rounded-md border border-borde px-3 py-1.5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const e = porEliminar;
                setPorEliminar(null);
                hacer(
                  () => pedir(`/panel/etiquetas/${e.id}`, { metodo: "DELETE", conSesion: true }),
                  `Se eliminó #${e.nombre}.`,
                );
              }}
              className="rounded-md bg-error px-3 py-1.5 font-semibold text-white"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
      <Caja>
        <table className="w-full text-sm">
          <thead className="bg-lateral text-lateral-texto">
            <tr>
              <th className={TH}>Etiqueta</th>
              <th className={`${TH} text-center`}>Publicados</th>
              {gestiona && <th className={TH}>Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {etiquetas?.length === 0 && (
              <tr>
                <td colSpan={3} className={`${TD} text-center text-texto-2`}>
                  Todavía no hay etiquetas.
                </td>
              </tr>
            )}
            {(etiquetas ?? []).map((e) => (
              <tr key={e.id} className="odd:bg-fondo/50">
                <td className={TD}>
                  {editando?.id === e.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        const nombre = editando.nombre;
                        setEditando(null);
                        hacer(
                          () =>
                            pedir(`/panel/etiquetas/${e.id}`, { metodo: "PUT", conSesion: true, cuerpo: { nombre } }),
                          `Ahora se llama #${nombre}.`,
                        );
                      }}
                    >
                      <input
                        id={`etiqueta-${e.id}`}
                        aria-label="Nuevo nombre"
                        autoFocus
                        value={editando.nombre}
                        onChange={(ev) => setEditando({ id: e.id, nombre: ev.target.value })}
                        minLength={2}
                        maxLength={40}
                        className="rounded-md border border-borde bg-superficie px-2 py-1"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-marca px-3 py-1 text-xs font-semibold text-sobre-marca"
                      >
                        Guardar
                      </button>
                    </form>
                  ) : (
                    <span className="font-medium">#{e.nombre}</span>
                  )}
                </td>
                <td className={`${TD} text-center tabular-nums`}>{e.articulos}</td>
                {gestiona && (
                  <td className={TD}>
                    <GrupoAcciones>
                      <BotonAccion
                        tipo="editar"
                        titulo="Renombrar"
                        onClick={() => setEditando({ id: e.id, nombre: e.nombre })}
                      />
                      <BotonAccion tipo="eliminar" titulo="Eliminar" onClick={() => setPorEliminar(e)} />
                    </GrupoAcciones>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Caja>
    </div>
  );
}
