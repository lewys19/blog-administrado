"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";
import { Aviso, BotonAccion, Caja, GrupoAcciones, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import type { Permiso, Rol } from "@/lib/tipos";

const ENTRADA = "w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca";

interface Borrador {
  id: number | null; // null = rol nuevo
  nombre: string;
  descripcion: string;
  permisos: string[];
}

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

/** Roles del equipo editorial y sus permisos. Para dar un rol a alguien: Usuarios. */
export function Autores() {
  const yo = usePanel();
  const [roles, setRoles] = useState<Rol[] | null>(null);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [porEliminar, setPorEliminar] = useState<Rol | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    pedir<Rol[]>("/panel/roles", { conSesion: true })
      .then(setRoles)
      .catch((e) => setError(mensaje(e, "No se pudieron cargar los roles.")));
  }, []);

  useEffect(() => {
    if (!puede(yo, "roles.gestionar")) return;
    cargar();
    pedir<Permiso[]>("/panel/permisos", { conSesion: true }).then(setPermisos).catch(() => {});
  }, [yo, cargar]);

  if (!puede(yo, "roles.gestionar")) return <SinPermiso />;
  const textoDe = (clave: string) => permisos.find((p) => p.clave === clave)?.texto ?? clave;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!borrador) return;
    setOk(null);
    setError(null);
    try {
      await pedir(borrador.id ? `/panel/roles/${borrador.id}` : "/panel/roles", {
        metodo: borrador.id ? "PUT" : "POST",
        conSesion: true,
        cuerpo: { nombre: borrador.nombre, descripcion: borrador.descripcion || null, permisos: borrador.permisos },
      });
      setOk(borrador.id ? `Se guardó «${borrador.nombre}».` : `Se creó el rol «${borrador.nombre}».`);
      setBorrador(null);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo guardar el rol."));
    }
  }

  async function eliminar(r: Rol) {
    setPorEliminar(null);
    setOk(null);
    setError(null);
    try {
      await pedir(`/panel/roles/${r.id}`, { metodo: "DELETE", conSesion: true });
      setOk(`Se eliminó el rol «${r.nombre}».`);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo eliminar."));
    }
  }

  const alternar = (clave: string) =>
    setBorrador((b) => b && { ...b, permisos: b.permisos.includes(clave) ? b.permisos.filter((p) => p !== clave) : [...b.permisos, clave] });

  return (
    <div className="mx-auto max-w-6xl">
      <Migas items={[{ texto: "Autores y roles" }]} />
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold tracking-tight">Autores y roles</h1>
        <button
          type="button"
          onClick={() => {
            setOk(null);
            setBorrador({ id: null, nombre: "", descripcion: "", permisos: [] });
          }}
          className="rounded-lg bg-lateral px-4 py-2 text-sm font-semibold text-white hover:bg-lateral-activo"
        >
          + Nuevo rol
        </button>
      </div>
      <p className="mb-4 text-sm text-texto-2">
        Para dar un rol a alguien, entra a <strong>Usuarios</strong> y elígelo en su fila. El Administrador tiene todos los permisos
        y no se puede cambiar.
      </p>

      <div className="mb-3 space-y-2">
        <Aviso ok={ok} error={error} />
        {porEliminar && (
          <div role="alertdialog" className="flex flex-wrap items-center gap-3 rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm">
            <span className="flex-1">¿Eliminar el rol «{porEliminar.nombre}»?</span>
            <button type="button" onClick={() => setPorEliminar(null)} className="rounded-md border border-borde px-3 py-1.5">
              Cancelar
            </button>
            <button type="button" onClick={() => eliminar(porEliminar)} className="rounded-md bg-error px-3 py-1.5 font-semibold text-white">
              Eliminar
            </button>
          </div>
        )}
      </div>

      {borrador && (
        <form onSubmit={guardar} className="mb-6">
          <Caja className="p-5">
            <h2 className="mb-4 font-bold">{borrador.id ? `Editar «${borrador.nombre}»` : "Nuevo rol"}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-texto-2">Nombre</span>
                <input
                  id="rol-nombre"
                  className={ENTRADA}
                  required
                  minLength={3}
                  maxLength={40}
                  value={borrador.nombre}
                  onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                  placeholder="Ej. Corrector, SEO"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-texto-2">Descripción (opcional)</span>
                <input
                  id="rol-descripcion"
                  className={ENTRADA}
                  maxLength={200}
                  value={borrador.descripcion}
                  onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })}
                />
              </label>
            </div>
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium text-texto-2">Permisos</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {permisos.map((p) => (
                  <label key={p.clave} className="flex items-center gap-2 rounded-md border border-borde px-3 py-2 text-sm hover:bg-fondo">
                    <input
                      id={`permiso-${p.clave}`}
                      type="checkbox"
                      checked={borrador.permisos.includes(p.clave)}
                      onChange={() => alternar(p.clave)}
                      className="accent-[var(--marca)]"
                    />
                    {p.texto}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setBorrador(null)} className="rounded-md border border-borde px-3 py-2 text-sm">
                Cancelar
              </button>
              <button type="submit" className="rounded-md bg-marca px-4 py-2 text-sm font-semibold text-sobre-marca hover:bg-marca-fuerte">
                Guardar rol
              </button>
            </div>
          </Caja>
        </form>
      )}

      <Caja>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-lateral text-lateral-texto">
              <tr>
                <th className={TH}>Rol</th>
                <th className={TH}>Permisos</th>
                <th className={`${TH} text-center`}>Personas</th>
                <th className={TH}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {roles === null ? (
                <tr>
                  <td colSpan={4} className={`${TD} text-center text-texto-2`}>
                    Cargando…
                  </td>
                </tr>
              ) : (
                roles.map((r) => (
                  <tr key={r.id} className={r.fijo ? "bg-marca-suave/50" : "odd:bg-fondo/50"}>
                    <td className={TD}>
                      <p className="font-semibold">{r.nombre}</p>
                      {r.descripcion && <p className="text-xs text-texto-2">{r.descripcion}</p>}
                    </td>
                    <td className={TD}>
                      {r.fijo ? (
                        "Todos"
                      ) : r.permisos.length ? (
                        <div className="flex flex-wrap gap-1">
                          {r.permisos.map((p) => (
                            <span key={p} className="rounded-full bg-fondo px-2 py-0.5 text-xs ring-1 ring-borde">
                              {textoDe(p)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-texto-2">Ninguno</span>
                      )}
                    </td>
                    <td className={`${TD} text-center tabular-nums`}>{r.usuarios}</td>
                    <td className={TD}>
                      {!r.fijo && (
                        <GrupoAcciones>
                          <BotonAccion
                            tipo="editar"
                            titulo="Editar"
                            onClick={() => {
                              setOk(null);
                              setBorrador({ id: r.id, nombre: r.nombre, descripcion: r.descripcion ?? "", permisos: r.permisos });
                            }}
                          />
                          <BotonAccion tipo="eliminar" titulo="Eliminar" onClick={() => setPorEliminar(r)} />
                        </GrupoAcciones>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Caja>
    </div>
  );
}
