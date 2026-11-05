"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Aviso, BotonAccion, Caja, GrupoAcciones, TD, TH } from "@/components/panel/Tabla";
import { precioTexto } from "@/lib/academia";
import { ErrorApi, pedir } from "@/lib/api";
import type { Promocion } from "@/lib/tipos";

const ENTRADA = "w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca";
const ETIQUETA = "mb-1 block font-medium text-texto-2";
const VACIO = { titulo: "", detalle: "", precio_anterior: "", precio: "", orden: "0", activa: true };

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

/** Packs con precio especial: se compran por WhatsApp desde /academia/promociones. */
export function Promociones() {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  const [datos, setDatos] = useState(VACIO);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    pedir<Promocion[]>("/panel/academia/promociones", { conSesion: true })
      .then(setPromociones)
      .catch((e) => setError(mensaje(e, "No se pudieron cargar las promociones.")));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setOk(null);
    setError(null);
    try {
      await pedir(editando ? `/panel/academia/promociones/${editando}` : "/panel/academia/promociones", {
        metodo: editando ? "PUT" : "POST",
        conSesion: true,
        cuerpo: { ...datos, precio_anterior: datos.precio_anterior || null, orden: Number(datos.orden) || 0 },
      });
      setOk(`Se guardó «${datos.titulo}».`);
      setEditando(null);
      setDatos(VACIO);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo guardar."));
    }
  }

  async function eliminar(p: Promocion) {
    setOk(null);
    setError(null);
    try {
      await pedir(`/panel/academia/promociones/${p.id}`, { metodo: "DELETE", conSesion: true });
      setOk(`Se eliminó «${p.titulo}».`);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo eliminar."));
    }
  }

  return (
    <div className="space-y-4">
      <Aviso ok={ok} error={error} />
      <form onSubmit={guardar}>
        <Caja className="grid gap-3 p-4 sm:grid-cols-4">
          <label className="block text-sm sm:col-span-4">
            <span className={ETIQUETA}>Título</span>
            <input
              id="promocion-titulo"
              className={ENTRADA}
              required
              minLength={2}
              maxLength={80}
              placeholder="2 cursos"
              value={datos.titulo}
              onChange={(e) => setDatos({ ...datos, titulo: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-4">
            <span className={ETIQUETA}>Qué incluye (uno por línea)</span>
            <textarea
              id="promocion-detalle"
              className={ENTRADA}
              rows={3}
              maxLength={1000}
              value={datos.detalle}
              onChange={(e) => setDatos({ ...datos, detalle: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className={ETIQUETA}>Precio anterior $</span>
            <input
              id="promocion-precio-anterior"
              className={ENTRADA}
              type="number"
              min="0"
              step="0.01"
              value={datos.precio_anterior}
              onChange={(e) => setDatos({ ...datos, precio_anterior: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className={ETIQUETA}>Precio promoción $</span>
            <input
              id="promocion-precio"
              className={ENTRADA}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={datos.precio}
              onChange={(e) => setDatos({ ...datos, precio: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className={ETIQUETA}>Orden</span>
            <input
              id="promocion-orden"
              className={ENTRADA}
              type="number"
              min="0"
              max="999"
              value={datos.orden}
              onChange={(e) => setDatos({ ...datos, orden: e.target.value })}
            />
          </label>
          <div className="flex items-end justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 pb-2">
              <input
                id="promocion-activa"
                type="checkbox"
                checked={datos.activa}
                onChange={(e) => setDatos({ ...datos, activa: e.target.checked })}
              />
              Activa
            </label>
            <button
              type="submit"
              className="rounded-lg bg-lateral px-4 py-2 font-semibold text-white hover:bg-lateral-activo"
            >
              {editando ? "Guardar" : "Agregar"}
            </button>
          </div>
        </Caja>
      </form>
      <Caja className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borde">
              <th className={TH}>Promoción</th>
              <th className={TH}>Precio</th>
              <th className={TH}>Estado</th>
              <th className={TH}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {promociones.map((p) => (
              <tr key={p.id} className="border-b border-borde last:border-0">
                <td className={`${TD} font-medium`}>{p.titulo}</td>
                <td className={TD}>{precioTexto(p.precio)}</td>
                <td className={TD}>{p.activa ? "Activa" : "Pausada"}</td>
                <td className={TD}>
                  <GrupoAcciones>
                    <BotonAccion
                      tipo="editar"
                      titulo={`Editar ${p.titulo}`}
                      onClick={() => {
                        setEditando(p.id);
                        setDatos({
                          titulo: p.titulo,
                          detalle: p.detalle.join("\n"),
                          precio_anterior: p.precio_anterior?.toString() ?? "",
                          precio: String(p.precio),
                          orden: String(p.orden),
                          activa: p.activa,
                        });
                      }}
                    />
                    <BotonAccion tipo="eliminar" titulo={`Eliminar ${p.titulo}`} onClick={() => eliminar(p)} />
                  </GrupoAcciones>
                </td>
              </tr>
            ))}
            {!promociones.length && (
              <tr>
                <td colSpan={4} className={`${TD} text-center text-texto-2`}>
                  Todavía no hay promociones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Caja>
    </div>
  );
}
