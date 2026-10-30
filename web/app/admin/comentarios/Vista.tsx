"use client";

import { useCallback, useEffect, useState } from "react";

import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";
import { Aviso, Caja, Paginacion } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import { fecha, hace } from "@/lib/formato";
import type { ComentarioPanel, EstadoComentario, PaginaComentarios } from "@/lib/tipos";

const POR_PAGINA = 20;
const PESTANAS: { estado: EstadoComentario; texto: string; vacio: string }[] = [
  { estado: "pendiente", texto: "Pendientes", vacio: "No hay comentarios por revisar. ¡Todo al día!" },
  { estado: "aprobado", texto: "Aprobados", vacio: "Todavía no hay comentarios aprobados." },
  { estado: "spam", texto: "Spam", vacio: "No hay spam." },
];

const boton = "rounded-md px-3 py-1.5 text-xs font-semibold text-white";

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

export function Comentarios() {
  const yo = usePanel();
  const [estado, setEstado] = useState<EstadoComentario>("pendiente");
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaComentarios | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<number | null>(null);

  // La búsqueda se aplica al dejar de escribir.
  useEffect(() => {
    const espera = setTimeout(() => {
      setQ(texto.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(espera);
  }, [texto]);

  const cargar = useCallback(() => {
    const params = new URLSearchParams({ estado, pagina: String(pagina), por_pagina: String(POR_PAGINA) });
    if (q) params.set("q", q);
    pedir<PaginaComentarios>(`/panel/comentarios?${params}`, { conSesion: true })
      .then((d) => (setDatos(d), setError(null)))
      .catch((e) => setError(mensaje(e, "No se pudo cargar la lista.")));
  }, [estado, q, pagina]);

  useEffect(() => {
    if (puede(yo, "comentarios.moderar")) cargar();
  }, [yo, cargar]);

  if (!puede(yo, "comentarios.moderar")) return <SinPermiso />;

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

  const mover = (c: ComentarioPanel, nuevo: EstadoComentario, exito: string) =>
    hacer(
      () => pedir(`/panel/comentarios/${c.id}`, { metodo: "PATCH", conSesion: true, cuerpo: { estado: nuevo } }),
      exito,
    );

  const cambiarPestana = (e: EstadoComentario) => {
    setEstado(e);
    setPagina(1);
    setDatos(null);
    setPorEliminar(null);
  };
  const actual = PESTANAS.find((p) => p.estado === estado)!;

  return (
    <div className="mx-auto max-w-5xl">
      <Migas items={[{ texto: "Comentarios" }]} />
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Comentarios</h1>
      <p className="mb-5 text-sm text-texto-2">
        Lo que escriben los lectores. Solo los aprobados se ven en el blog; quien ya tiene uno aprobado publica al
        instante, y quien es marcado como spam queda filtrado.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Estado"
          className="inline-flex rounded-lg border border-borde bg-superficie p-1"
        >
          {PESTANAS.map((p) => (
            <button
              key={p.estado}
              type="button"
              role="tab"
              aria-selected={estado === p.estado}
              onClick={() => cambiarPestana(p.estado)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold ${
                estado === p.estado ? "bg-lateral text-white" : "text-texto-2 hover:text-texto"
              }`}
            >
              {p.texto}
              {datos && (
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    estado === p.estado
                      ? "bg-white/20"
                      : p.estado === "pendiente" && datos.conteo.pendiente
                        ? "bg-aviso text-white"
                        : "bg-fondo"
                  }`}
                >
                  {datos.conteo[p.estado]}
                </span>
              )}
            </button>
          ))}
        </div>
        <label className="flex min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-borde bg-superficie sm:max-w-sm">
          <span className="sr-only">Buscar comentarios</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nombre, correo, texto o artículo"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          />
        </label>
      </div>

      <div className="mb-3">
        <Aviso ok={ok} error={error} />
      </div>

      <Caja>
        {datos === null ? (
          <p className="p-6 text-center text-sm text-texto-2">Cargando…</p>
        ) : datos.comentarios.length === 0 ? (
          <p className="p-10 text-center text-sm text-texto-2">{q ? "Nada coincide con la búsqueda." : actual.vacio}</p>
        ) : (
          <ul className="divide-y divide-borde">
            {datos.comentarios.map((c) => (
              <li key={c.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <p className="text-sm">
                    <span className="font-bold">{c.nombre}</span> <span className="text-texto-2">· {c.correo}</span>
                  </p>
                  <p className="text-xs text-texto-2" title={fecha(c.creado_en)}>
                    {hace(c.creado_en)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-texto-2">
                  En{" "}
                  <a
                    href={`/blog/${c.articulo.slug}#comentarios`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-marca-fuerte hover:underline"
                  >
                    {c.articulo.nombre}
                  </a>
                </p>
                <p className="mt-2 rounded-lg bg-fondo px-3 py-2 text-sm break-words whitespace-pre-line">
                  {c.contenido}
                </p>

                {porEliminar === c.id ? (
                  <div
                    role="alertdialog"
                    className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-sm"
                  >
                    <span className="flex-1">¿Borrar este comentario para siempre?</span>
                    <button
                      type="button"
                      onClick={() => setPorEliminar(null)}
                      className="rounded-md border border-borde px-3 py-1.5 text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPorEliminar(null);
                        hacer(
                          () => pedir(`/panel/comentarios/${c.id}`, { metodo: "DELETE", conSesion: true }),
                          `Se borró el comentario de ${c.nombre}.`,
                        );
                      }}
                      className={`${boton} bg-error`}
                    >
                      Borrar
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.estado !== "aprobado" && (
                      <button
                        type="button"
                        onClick={() =>
                          mover(
                            c,
                            "aprobado",
                            c.estado === "spam"
                              ? `Listo: el comentario de ${c.nombre} no era spam y ya está publicado.`
                              : `Se publicó el comentario de ${c.nombre}.`,
                          )
                        }
                        className={`${boton} bg-marca hover:bg-marca-fuerte`}
                      >
                        {c.estado === "spam" ? "No es spam: aprobar" : "Aprobar"}
                      </button>
                    )}
                    {c.estado === "aprobado" && (
                      <button
                        type="button"
                        onClick={() => mover(c, "pendiente", `Se ocultó el comentario de ${c.nombre}.`)}
                        className={`${boton} bg-stone-600 hover:bg-stone-700`}
                      >
                        Ocultar
                      </button>
                    )}
                    {c.estado !== "spam" && (
                      <button
                        type="button"
                        onClick={() =>
                          mover(c, "spam", `Marcado como spam: lo próximo de ${c.nombre} irá directo a Spam.`)
                        }
                        className={`${boton} bg-amber-500 hover:bg-amber-600`}
                      >
                        Spam
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPorEliminar(c.id)}
                      className={`${boton} bg-red-600 hover:bg-red-700`}
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Caja>

      {datos && datos.total > POR_PAGINA && (
        <div className="mt-4">
          <Paginacion pagina={pagina} porPagina={POR_PAGINA} total={datos.total} alCambiar={setPagina} />
        </div>
      )}
    </div>
  );
}
