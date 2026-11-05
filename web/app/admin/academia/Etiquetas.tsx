"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Aviso, BotonAccion, Caja, GrupoAcciones, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import type { EtiquetaAcademia, GrupoEtiqueta } from "@/lib/tipos";

const ENTRADA = "w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca";
const GRUPOS: Record<GrupoEtiqueta, string> = {
  cursos: "Populares · Cursos",
  manuales: "Manuales",
  sistemas: "Sistemas",
};

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

/** Etiquetas de la columna derecha: al hacer clic buscan su nombre en su sección. */
export function Etiquetas() {
  const [etiquetas, setEtiquetas] = useState<EtiquetaAcademia[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [grupo, setGrupo] = useState<GrupoEtiqueta>("cursos");
  const [orden, setOrden] = useState("0");
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    pedir<EtiquetaAcademia[]>("/panel/academia/etiquetas", { conSesion: true })
      .then(setEtiquetas)
      .catch((e) => setError(mensaje(e, "No se pudieron cargar las etiquetas.")));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function limpiar() {
    setEditando(null);
    setNombre("");
    setOrden("0");
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setOk(null);
    setError(null);
    try {
      await pedir(editando ? `/panel/academia/etiquetas/${editando}` : "/panel/academia/etiquetas", {
        metodo: editando ? "PUT" : "POST",
        conSesion: true,
        cuerpo: { nombre, grupo, orden: Number(orden) || 0 },
      });
      setOk(`Se guardó «${nombre}».`);
      limpiar();
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo guardar."));
    }
  }

  async function eliminar(e: EtiquetaAcademia) {
    setOk(null);
    setError(null);
    try {
      await pedir(`/panel/academia/etiquetas/${e.id}`, { metodo: "DELETE", conSesion: true });
      setOk(`Se eliminó «${e.nombre}».`);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo eliminar."));
    }
  }

  return (
    <div className="space-y-4">
      <Aviso ok={ok} error={error} />
      <form onSubmit={guardar}>
        <Caja className="grid items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_90px_auto]">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-texto-2">Etiqueta</span>
            <input
              id="etiqueta-nombre"
              className={ENTRADA}
              required
              maxLength={40}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-texto-2">Grupo</span>
            <select
              id="etiqueta-grupo"
              className={ENTRADA}
              value={grupo}
              onChange={(e) => setGrupo(e.target.value as GrupoEtiqueta)}
            >
              {Object.entries(GRUPOS).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-texto-2">Orden</span>
            <input
              id="etiqueta-orden"
              className={ENTRADA}
              type="number"
              min="0"
              max="999"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-lateral px-4 py-2 text-sm font-semibold text-white hover:bg-lateral-activo"
          >
            {editando ? "Guardar" : "Agregar"}
          </button>
        </Caja>
      </form>
      <Caja className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borde">
              <th className={TH}>Etiqueta</th>
              <th className={TH}>Grupo</th>
              <th className={TH}>Orden</th>
              <th className={TH}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {etiquetas.map((e) => (
              <tr key={e.id} className="border-b border-borde last:border-0">
                <td className={`${TD} font-medium`}>{e.nombre}</td>
                <td className={TD}>{GRUPOS[e.grupo]}</td>
                <td className={TD}>{e.orden}</td>
                <td className={TD}>
                  <GrupoAcciones>
                    <BotonAccion
                      tipo="editar"
                      titulo={`Editar ${e.nombre}`}
                      onClick={() => {
                        setEditando(e.id);
                        setNombre(e.nombre);
                        setGrupo(e.grupo);
                        setOrden(String(e.orden));
                      }}
                    />
                    <BotonAccion tipo="eliminar" titulo={`Eliminar ${e.nombre}`} onClick={() => eliminar(e)} />
                  </GrupoAcciones>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Caja>
    </div>
  );
}
