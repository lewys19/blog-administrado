"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { EVENTO_FUENTES, Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";
import { Aviso, Caja, Paginacion, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import { fecha } from "@/lib/formato";
import type { Categoria } from "@/lib/tipos";

interface Fuente {
  id: number;
  nombre: string;
  url: string;
  categoria_id: number | null;
  activa: boolean;
  palabras: string;
  leida_en: string | null;
  ultimo_error: string | null;
  nuevas: number;
}

interface Noticia {
  id: number;
  fuente: string;
  titulo: string;
  enlace: string;
  extracto: string;
  publicado_en: string | null;
  estado: "nueva" | "usada" | "descartada";
  articulo_id: number | null;
}

interface Pagina {
  total: number;
  noticias: Noticia[];
}

const ENTRADA = "w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca";
const BOTON =
  "rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-sobre-marca hover:bg-marca-fuerte disabled:opacity-60";
const SECUNDARIO =
  "rounded-lg border border-borde px-3 py-1.5 text-sm font-medium hover:border-marca disabled:opacity-60";
const POR_PAGINA = 20;
const VACIA = { nombre: "", url: "", categoria_id: "", palabras: "" };
const ESTADOS = [
  { valor: "nueva", texto: "Nuevas" },
  { valor: "usada", texto: "Con borrador" },
  { valor: "descartada", texto: "Descartadas" },
] as const;

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

/** Noticias de otros sitios por RSS: nada se publica solo, cada una acaba en un borrador tuyo. */
export function Fuentes() {
  const yo = usePanel();
  const [pestana, setPestana] = useState<"bandeja" | "fuentes">("bandeja");
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [datos, setDatos] = useState<Pagina | null>(null);
  const [estado, setEstado] = useState<Noticia["estado"]>("nueva");
  const [fuenteId, setFuenteId] = useState("");
  const [pagina, setPagina] = useState(1);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [forma, setForma] = useState(VACIA);
  const [editando, setEditando] = useState<Fuente | null>(null);
  const [porBorrar, setPorBorrar] = useState<Fuente | null>(null);
  const [elegidas, setElegidas] = useState<number[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarFuentes = useCallback(() => {
    pedir<Fuente[]>("/panel/fuentes", { conSesion: true })
      .then(setFuentes)
      .catch((e) => setError(mensaje(e, "No se pudieron cargar las fuentes.")));
  }, []);

  const cargarNoticias = useCallback(() => {
    const filtro = new URLSearchParams({ estado, pagina: String(pagina), por_pagina: String(POR_PAGINA) });
    if (fuenteId) filtro.set("fuente_id", fuenteId);
    pedir<Pagina>(`/panel/noticias?${filtro}`, { conSesion: true })
      .then(setDatos)
      .catch((e) => setError(mensaje(e, "No se pudieron cargar las noticias.")));
  }, [estado, fuenteId, pagina]);

  useEffect(cargarFuentes, [cargarFuentes]);
  useEffect(() => {
    pedir<Categoria[]>("/panel/categorias", { conSesion: true })
      .then(setCategorias)
      .catch(() => {});
  }, []);
  useEffect(cargarNoticias, [cargarNoticias]);

  if (!puede(yo, "fuentes.gestionar")) return <SinPermiso />;

  async function accion(hacer: () => Promise<string>) {
    setOk(null);
    setError(null);
    setOcupado(true);
    try {
      setOk(await hacer());
      setElegidas([]);
      cargarFuentes();
      cargarNoticias();
      window.dispatchEvent(new Event(EVENTO_FUENTES));
    } catch (e) {
      setError(mensaje(e, "No se pudo completar la acción."));
    } finally {
      setOcupado(false);
    }
  }

  const actualizar = () =>
    accion(async () => {
      const r = await pedir<{ leidas: number; con_error: number; nuevas: number }>("/panel/fuentes/actualizar", {
        metodo: "POST",
        conSesion: true,
      });
      const fallas = r.con_error ? ` ${r.con_error} fuente(s) con error: míralas en la pestaña Fuentes.` : "";
      return `${r.nuevas} noticia(s) nueva(s) de ${r.leidas} fuente(s).${fallas}`;
    });

  const crearBorrador = (n: Noticia) =>
    accion(async () => {
      await pedir(`/panel/noticias/${n.id}/borrador`, { metodo: "POST", conSesion: true });
      return `Borrador creado: «${n.titulo}». Está en la pestaña Con borrador.`;
    });

  const descartar = (n: Noticia) =>
    accion(async () => {
      await pedir(`/panel/noticias/${n.id}/descartar`, { metodo: "POST", conSesion: true });
      return "Noticia descartada.";
    });

  const lote = (tipo: "borrador" | "descartar") =>
    accion(async () => {
      const r = await pedir<{ procesadas: number }>("/panel/noticias/lote", {
        metodo: "POST",
        conSesion: true,
        cuerpo: { ids: elegidas, accion: tipo },
      });
      return tipo === "borrador"
        ? `${r.procesadas} borrador(es) creado(s).`
        : `${r.procesadas} noticia(s) descartada(s).`;
    });

  const cuerpoFuente = (f: Fuente, cambios: object) => ({
    nombre: f.nombre,
    url: f.url,
    categoria_id: f.categoria_id,
    palabras: f.palabras,
    activa: f.activa,
    ...cambios,
  });

  const cambiarActiva = (f: Fuente) =>
    accion(async () => {
      await pedir(`/panel/fuentes/${f.id}`, {
        metodo: "PUT",
        conSesion: true,
        cuerpo: cuerpoFuente(f, { activa: !f.activa }),
      });
      return f.activa ? `${f.nombre} desactivada.` : `${f.nombre} activada.`;
    });

  const borrarFuente = (f: Fuente) =>
    accion(async () => {
      await pedir(`/panel/fuentes/${f.id}`, { metodo: "DELETE", conSesion: true });
      setPorBorrar(null);
      return `${f.nombre} eliminada.`;
    });

  function editar(f: Fuente) {
    setEditando(f);
    setForma({
      nombre: f.nombre,
      url: f.url,
      categoria_id: f.categoria_id ? String(f.categoria_id) : "",
      palabras: f.palabras,
    });
  }

  function cancelar() {
    setEditando(null);
    setForma(VACIA);
  }

  function guardarFuente(e: FormEvent) {
    e.preventDefault();
    const datos = { ...forma, categoria_id: forma.categoria_id ? Number(forma.categoria_id) : null };
    accion(async () => {
      await pedir(editando ? `/panel/fuentes/${editando.id}` : "/panel/fuentes", {
        metodo: editando ? "PUT" : "POST",
        conSesion: true,
        cuerpo: editando ? cuerpoFuente(editando, datos) : datos,
      });
      cancelar();
      return editando ? "Fuente guardada." : "Fuente agregada.";
    });
  }

  const caidas = fuentes.filter((f) => f.activa && f.ultimo_error);
  const visibles = datos?.noticias ?? [];
  const todasElegidas = !!visibles.length && visibles.every((n) => elegidas.includes(n.id));
  const alternar = (id: number) =>
    setElegidas(elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id]);

  const pestanaBoton = (activa: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${activa ? "border-marca font-semibold" : "border-borde"}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Migas items={[{ texto: "Fuentes" }]} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold tracking-tight">Fuentes de noticias</h1>
        <button type="button" className={BOTON} disabled={ocupado} onClick={actualizar}>
          {ocupado ? "Un momento…" : "Actualizar ahora"}
        </button>
      </div>
      <div className="mb-3 space-y-2">
        <Aviso ok={ok} error={error} />
        {!!caidas.length && (
          <p role="alert" className="rounded-lg border border-error px-3 py-2 text-sm text-error">
            {caidas.length} fuente(s) con error: {caidas.map((f) => f.nombre).join(", ")}. Revisa la pestaña Fuentes.
          </p>
        )}
      </div>
      <div className="mb-4 flex gap-2">
        <button type="button" className={pestanaBoton(pestana === "bandeja")} onClick={() => setPestana("bandeja")}>
          Bandeja
        </button>
        <button type="button" className={pestanaBoton(pestana === "fuentes")} onClick={() => setPestana("fuentes")}>
          Fuentes
        </button>
      </div>

      {pestana === "bandeja" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {ESTADOS.map((e) => (
              <button
                key={e.valor}
                type="button"
                className={pestanaBoton(estado === e.valor)}
                onClick={() => {
                  setEstado(e.valor);
                  setPagina(1);
                }}
              >
                {e.texto}
              </button>
            ))}
            <select
              id="fuentes-filtro"
              aria-label="Filtrar por fuente"
              value={fuenteId}
              onChange={(e) => {
                setFuenteId(e.target.value);
                setPagina(1);
              }}
              className={`${ENTRADA} ml-auto w-auto`}
            >
              <option value="">Todas las fuentes</option>
              {fuentes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </div>
          {estado === "nueva" && !!visibles.length && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  id="noticias-todas"
                  type="checkbox"
                  checked={todasElegidas}
                  onChange={() => setElegidas(todasElegidas ? [] : visibles.map((n) => n.id))}
                  className="accent-[var(--marca)]"
                />
                Elegir todas
              </label>
              {!!elegidas.length && (
                <>
                  <span className="text-texto-2">{elegidas.length} elegida(s)</span>
                  <button type="button" className={SECUNDARIO} disabled={ocupado} onClick={() => lote("borrador")}>
                    Crear borradores
                  </button>
                  <button type="button" className={SECUNDARIO} disabled={ocupado} onClick={() => lote("descartar")}>
                    Descartar elegidas
                  </button>
                </>
              )}
            </div>
          )}
          {datos?.noticias.map((n) => (
            <Caja key={n.id} className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-xs text-texto-2">
                {n.estado === "nueva" && (
                  <input
                    type="checkbox"
                    aria-label={`Elegir ${n.titulo}`}
                    checked={elegidas.includes(n.id)}
                    onChange={() => alternar(n.id)}
                    className="accent-[var(--marca)]"
                  />
                )}
                <span>
                  {n.fuente}
                  {n.publicado_en ? ` · ${fecha(n.publicado_en)}` : ""}
                </span>
              </div>
              <h2 className="font-bold">{n.titulo}</h2>
              {n.extracto && <p className="line-clamp-3 text-sm text-texto-2">{n.extracto}</p>}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {n.articulo_id ? (
                  <Link href={`/admin/articulos/${n.articulo_id}`} className={SECUNDARIO}>
                    Abrir borrador
                  </Link>
                ) : (
                  <button type="button" className={SECUNDARIO} disabled={ocupado} onClick={() => crearBorrador(n)}>
                    Crear borrador
                  </button>
                )}
                {n.estado === "nueva" && (
                  <button type="button" className={SECUNDARIO} disabled={ocupado} onClick={() => descartar(n)}>
                    Descartar
                  </button>
                )}
                <a
                  href={n.enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-marca-fuerte hover:underline"
                >
                  Ver original ↗
                </a>
              </div>
            </Caja>
          ))}
          {datos && !datos.noticias.length && (
            <Caja className="p-8 text-center text-texto-2">
              {estado === "nueva" ? "No hay noticias nuevas. Pulsa «Actualizar ahora»." : "No hay noticias aquí."}
            </Caja>
          )}
          <Paginacion pagina={pagina} porPagina={POR_PAGINA} total={datos?.total ?? 0} alCambiar={setPagina} />
        </div>
      )}

      {pestana === "fuentes" && (
        <div className="space-y-4">
          <Caja className="p-4">
            <form onSubmit={guardarFuente} className="grid gap-2 sm:grid-cols-2">
              <input
                id="fuente-nombre"
                required
                minLength={2}
                maxLength={80}
                value={forma.nombre}
                onChange={(e) => setForma({ ...forma, nombre: e.target.value })}
                placeholder="Nombre"
                aria-label="Nombre de la fuente"
                className={ENTRADA}
              />
              <input
                id="fuente-url"
                required
                type="url"
                maxLength={500}
                value={forma.url}
                onChange={(e) => setForma({ ...forma, url: e.target.value })}
                placeholder="https://sitio.com/feed"
                aria-label="Dirección del RSS"
                className={ENTRADA}
              />
              <select
                id="fuente-categoria"
                aria-label="Categoría de sus borradores"
                value={forma.categoria_id}
                onChange={(e) => setForma({ ...forma, categoria_id: e.target.value })}
                className={ENTRADA}
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <input
                id="fuente-palabras"
                maxLength={300}
                value={forma.palabras}
                onChange={(e) => setForma({ ...forma, palabras: e.target.value })}
                placeholder="Solo estos temas: IA, Python, Docker (vacío = todo)"
                aria-label="Palabras de filtro, separadas por comas"
                className={ENTRADA}
              />
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className={BOTON} disabled={ocupado}>
                  {editando ? "Guardar fuente" : "Agregar fuente"}
                </button>
                {editando && (
                  <button type="button" className={SECUNDARIO} onClick={cancelar}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </Caja>
          <Caja className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH}>Fuente</th>
                  <th className={TH}>Nuevas</th>
                  <th className={TH}>Última lectura</th>
                  <th className={TH}>Estado</th>
                  <th className={TH}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {fuentes.map((f) => (
                  <tr key={f.id}>
                    <td className={TD}>
                      {f.nombre}
                      {f.palabras && <p className="text-xs text-texto-2">Filtro: {f.palabras}</p>}
                      {f.ultimo_error && <p className="text-xs text-error">{f.ultimo_error}</p>}
                    </td>
                    <td className={TD}>{f.nuevas}</td>
                    <td className={TD}>{f.leida_en ? fecha(f.leida_en) : "Nunca"}</td>
                    <td className={TD}>{f.activa ? "Activa" : "Inactiva"}</td>
                    <td className={TD}>
                      {porBorrar?.id === f.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs">¿Eliminar también sus noticias?</span>
                          <button
                            type="button"
                            className={SECUNDARIO}
                            disabled={ocupado}
                            onClick={() => borrarFuente(f)}
                          >
                            Sí, eliminar
                          </button>
                          <button type="button" className={SECUNDARIO} onClick={() => setPorBorrar(null)}>
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={SECUNDARIO} onClick={() => editar(f)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className={SECUNDARIO}
                            disabled={ocupado}
                            onClick={() => cambiarActiva(f)}
                          >
                            {f.activa ? "Desactivar" : "Activar"}
                          </button>
                          <button type="button" className={SECUNDARIO} onClick={() => setPorBorrar(f)}>
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Caja>
        </div>
      )}
    </div>
  );
}
