"use client";

import { useCallback, useEffect, useState } from "react";

import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";
import { Aviso, BotonAccion, Caja, GrupoAcciones, Paginacion, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import { fecha, hace } from "@/lib/formato";
import type { PaginaUsuarios, Rol, UsuarioFila } from "@/lib/tipos";

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

export function Usuarios() {
  const yo = usePanel();
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaUsuarios | null>(null);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Confirmación dentro de la página (no con window.confirm): qué usuario se va a eliminar.
  const [porEliminar, setPorEliminar] = useState<UsuarioFila | null>(null);

  // La búsqueda se aplica al dejar de escribir (no una petición por tecla).
  useEffect(() => {
    const espera = setTimeout(() => {
      setQ(texto.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(espera);
  }, [texto]);

  const cargar = useCallback(() => {
    const params = new URLSearchParams({ pagina: String(pagina), por_pagina: "20" });
    if (q) params.set("q", q);
    pedir<PaginaUsuarios>(`/panel/usuarios?${params}`, { conSesion: true })
      .then((d) => (setDatos(d), setError(null)))
      .catch((e) => setError(mensaje(e, "No se pudo cargar la lista.")));
  }, [q, pagina]);

  useEffect(() => {
    if (!puede(yo, "usuarios.ver")) return;
    cargar();
    pedir<Rol[]>("/panel/roles", { conSesion: true }).then(setRoles).catch(() => {});
  }, [yo, cargar]);

  if (!puede(yo, "usuarios.ver")) return <SinPermiso />;
  const editar = puede(yo, "usuarios.editar");
  const asignar = puede(yo, "roles.gestionar");

  async function hacer(accion: () => Promise<unknown>, exito: string) {
    setOk(null);
    setError(null);
    try {
      await accion();
      setOk(exito);
      cargar();
    } catch (e) {
      setError(mensaje(e, "No se pudo guardar."));
    }
  }

  const cambiarRol = (u: UsuarioFila, valor: string) =>
    hacer(
      () =>
        pedir(`/panel/usuarios/${u.id}/rol`, {
          metodo: "PUT",
          conSesion: true,
          cuerpo: { rol_id: valor ? Number(valor) : null },
        }),
      valor ? `@${u.username} ahora es ${roles.find((r) => r.id === Number(valor))?.nombre}.` : `@${u.username} ya no entra al panel.`,
    );
  const alternarBloqueo = (u: UsuarioFila) =>
    hacer(
      () => pedir(`/panel/usuarios/${u.id}`, { metodo: "PATCH", conSesion: true, cuerpo: { bloqueado: !u.bloqueado } }),
      u.bloqueado ? `Se desbloqueó a @${u.username}.` : `Se bloqueó a @${u.username}: ya no puede ingresar.`,
    );

  return (
    <div className="mx-auto max-w-6xl">
      <Migas items={[{ texto: "Usuarios" }]} />
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Usuarios</h1>

      <label className="mb-4 flex w-full items-center overflow-hidden rounded-lg border border-borde bg-superficie sm:max-w-md">
        <span className="sr-only">Buscar usuarios</span>
        <input
          id="buscar-usuarios"
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre, correo, @username o número"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
      </label>

      <div className="mb-3 space-y-2">
        <Aviso ok={ok} error={error} />
        {porEliminar && (
          <div role="alertdialog" className="flex flex-wrap items-center gap-3 rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm">
            <span className="flex-1">
              ¿Eliminar la cuenta de <strong>@{porEliminar.username}</strong>? Sus datos se borran y no se puede deshacer.
            </span>
            <button type="button" onClick={() => setPorEliminar(null)} className="rounded-md border border-borde px-3 py-1.5">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const u = porEliminar;
                setPorEliminar(null);
                hacer(() => pedir(`/panel/usuarios/${u.id}`, { metodo: "DELETE", conSesion: true }), `Se eliminó la cuenta de @${u.username}.`);
              }}
              className="rounded-md bg-error px-3 py-1.5 font-semibold text-white"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      <Caja>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="bg-lateral text-lateral-texto">
              <tr>
                <th className={TH}>Usuario</th>
                <th className={TH}>Correo</th>
                <th className={TH}>Rol en el panel</th>
                <th className={TH}>Estado</th>
                <th className={TH}>Registro</th>
                <th className={TH}>Último ingreso</th>
                {editar && <th className={TH}>Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {datos === null ? (
                <tr>
                  <td colSpan={7} className={`${TD} text-center text-texto-2`}>
                    Cargando…
                  </td>
                </tr>
              ) : datos.usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${TD} text-center text-texto-2`}>
                    {q ? "Nadie coincide con la búsqueda." : "Todavía no hay usuarios."}
                  </td>
                </tr>
              ) : (
                datos.usuarios.map((u) => {
                  const mismo = u.id === yo.id;
                  return (
                    <tr key={u.id} className="odd:bg-fondo/50">
                      <td className={TD}>
                        <p className="font-medium">{u.nombre}</p>
                        <p className="text-xs text-texto-2">
                          @{u.username} · #{u.id}
                        </p>
                      </td>
                      <td className={TD}>{u.email}</td>
                      <td className={TD}>
                        {asignar && !mismo ? (
                          <select
                            id={`rol-${u.id}`}
                            aria-label={`Rol de @${u.username}`}
                            value={u.rol?.id ?? ""}
                            onChange={(e) => cambiarRol(u, e.target.value)}
                            className="rounded-md border border-borde bg-superficie px-2 py-1"
                          >
                            <option value="">Lector (sin panel)</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.nombre}
                              </option>
                            ))}
                          </select>
                        ) : (
                          (u.rol?.nombre ?? "Lector")
                        )}
                      </td>
                      <td className={TD}>
                        {u.bloqueado ? (
                          <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-semibold text-error">Bloqueado</span>
                        ) : (
                          <span className="rounded-full bg-marca-suave px-2 py-0.5 text-xs font-semibold text-marca-fuerte">Activo</span>
                        )}
                      </td>
                      <td className={`${TD} tabular-nums`}>{fecha(u.creado_en)}</td>
                      <td className={`${TD} text-texto-2`}>{u.ultimo_ingreso_en ? hace(u.ultimo_ingreso_en) : "Nunca"}</td>
                      {editar && (
                        <td className={TD}>
                          {!mismo && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => alternarBloqueo(u)}
                                className="rounded-md border border-borde px-2 py-1 text-xs hover:border-aviso"
                              >
                                {u.bloqueado ? "Desbloquear" : "Bloquear"}
                              </button>
                              <GrupoAcciones>
                                <BotonAccion tipo="eliminar" titulo="Eliminar cuenta" onClick={() => setPorEliminar(u)} />
                              </GrupoAcciones>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {datos && <Paginacion pagina={datos.pagina} porPagina={datos.por_pagina} total={datos.total} alCambiar={setPagina} />}
      </Caja>
    </div>
  );
}
