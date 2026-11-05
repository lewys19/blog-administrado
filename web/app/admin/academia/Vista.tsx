"use client";

import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Migas } from "@/components/panel/Panel";
import { Aviso, BotonAccion, Caja, GrupoAcciones, TD, TH } from "@/components/panel/Tabla";
import { type Nivel, NIVELES, precioTexto, SECCIONES_ACADEMIA, seccionAcademia } from "@/lib/academia";
import { ErrorApi, pedir } from "@/lib/api";
import type { CategoriaAcademia, CursoPanel } from "@/lib/tipos";

import { Anuncios } from "./Anuncios";
import { Etiquetas } from "./Etiquetas";

const ENTRADA = "w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca";
const BOTON = "rounded-lg bg-lateral px-4 py-2 text-sm font-semibold text-white hover:bg-lateral-activo";
const ETIQUETA = "mb-1 block font-medium text-texto-2";

const OTRAS = { categorias: "Categorías", etiquetas: "Etiquetas", publicidad: "Publicidad" } as const;

interface BorradorCurso {
  id: number | null;
  categoria_id: string;
  titulo: string;
  descripcion: string;
  temario: string;
  tecnologias: string;
  instalacion: string;
  nivel: Nivel;
  horas: string;
  precio_anterior: string;
  precio: string;
  enlace: string;
  destacado: boolean;
  publicado: boolean;
  portada: string | null;
}

interface BorradorCategoria {
  id: number | null;
  nombre: string;
  descripcion: string;
  orden: string;
}

type PorEliminar = { tipo: "curso"; id: number; nombre: string } | { tipo: "categoria"; id: number; nombre: string };

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

function aBorrador(c: CursoPanel): BorradorCurso {
  return {
    id: c.id,
    categoria_id: String(c.categoria_id),
    titulo: c.titulo,
    descripcion: c.descripcion,
    temario: c.temario.join("\n"),
    tecnologias: c.tecnologias.join(", "),
    instalacion: c.instalacion,
    nivel: c.nivel,
    horas: c.horas?.toString() ?? "",
    precio_anterior: c.precio_anterior?.toString() ?? "",
    precio: String(c.precio),
    enlace: c.enlace ?? "",
    destacado: c.destacado,
    publicado: c.publicado,
    portada: c.portada,
  };
}

/** Cada sección empieza limpia: un borrador de Cursos no se arrastra a Manuales. */
export function Academia() {
  const { pestana } = useParams<{ pestana: string }>();
  return <Seccion key={pestana} pestana={pestana} />;
}

function Seccion({ pestana }: { pestana: string }) {
  const seccion = seccionAcademia(pestana);
  const textos = seccion ? SECCIONES_ACADEMIA[seccion] : null;
  const esSistema = textos?.tipo === "sistema";
  const titulo = textos?.titulo ?? OTRAS[pestana as keyof typeof OTRAS] ?? "Academia";
  const [cursos, setCursos] = useState<CursoPanel[] | null>(null);
  const [categorias, setCategorias] = useState<CategoriaAcademia[]>([]);
  const [curso, setCurso] = useState<BorradorCurso | null>(null);
  const [portada, setPortada] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<BorradorCategoria | null>(null);
  const [porEliminar, setPorEliminar] = useState<PorEliminar | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    Promise.all([
      textos ? pedir<CursoPanel[]>(`/panel/academia/cursos?tipo=${textos.tipo}`, { conSesion: true }) : [],
      pedir<CategoriaAcademia[]>("/academia/categorias"),
    ])
      .then(([cu, ca]) => {
        setCursos(cu);
        setCategorias(ca);
      })
      .catch((e) => setError(mensaje(e, "No se pudo cargar la Academia.")));
  }, [textos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function limpiarAvisos() {
    setOk(null);
    setError(null);
  }

  function nuevoCurso() {
    limpiarAvisos();
    setPortada(null);
    setCurso({
      id: null,
      categoria_id: categorias[0] ? String(categorias[0].id) : "",
      titulo: "",
      descripcion: "",
      temario: "",
      tecnologias: "",
      instalacion: "",
      nivel: "principiante",
      horas: "",
      precio_anterior: "",
      precio: "",
      enlace: "",
      destacado: false,
      publicado: true,
      portada: null,
    });
  }

  async function guardarCurso(e: FormEvent) {
    e.preventDefault();
    if (!curso) return;
    limpiarAvisos();
    setGuardando(true);
    try {
      const guardado = await pedir<CursoPanel>(
        curso.id ? `/panel/academia/cursos/${curso.id}` : "/panel/academia/cursos",
        {
          metodo: curso.id ? "PUT" : "POST",
          conSesion: true,
          cuerpo: {
            categoria_id: Number(curso.categoria_id),
            titulo: curso.titulo,
            descripcion: curso.descripcion,
            tipo: textos?.tipo,
            temario: curso.temario,
            tecnologias: curso.tecnologias,
            instalacion: curso.instalacion,
            nivel: curso.nivel,
            horas: curso.horas ? Number(curso.horas) : null,
            precio_anterior: curso.precio_anterior || null,
            precio: curso.precio,
            enlace: curso.enlace || null,
            destacado: curso.destacado,
            publicado: curso.publicado,
          },
        },
      );
      if (portada) {
        const cuerpo = new FormData();
        cuerpo.append("foto", portada);
        try {
          await pedir(`/panel/academia/cursos/${guardado.id}/portada`, { metodo: "PUT", conSesion: true, cuerpo });
        } catch (err) {
          // El curso ya existe: se abre para editar y no se duplica al reintentar.
          setCurso(aBorrador(guardado));
          setError(`Se guardó el curso, pero no la portada: ${mensaje(err, "inténtalo otra vez.")}`);
          cargar();
          return;
        }
      }
      setOk(`Se guardó «${guardado.titulo}».`);
      setCurso(null);
      setPortada(null);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo guardar el curso."));
    } finally {
      setGuardando(false);
    }
  }

  async function guardarCategoria(e: FormEvent) {
    e.preventDefault();
    if (!categoria) return;
    limpiarAvisos();
    try {
      await pedir(categoria.id ? `/panel/academia/categorias/${categoria.id}` : "/panel/academia/categorias", {
        metodo: categoria.id ? "PUT" : "POST",
        conSesion: true,
        cuerpo: {
          nombre: categoria.nombre,
          descripcion: categoria.descripcion || null,
          orden: Number(categoria.orden) || 0,
        },
      });
      setOk(`Se guardó «${categoria.nombre}».`);
      setCategoria(null);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo guardar la categoría."));
    }
  }

  async function eliminar(p: PorEliminar) {
    setPorEliminar(null);
    limpiarAvisos();
    try {
      const ruta = p.tipo === "curso" ? "cursos" : "categorias";
      await pedir(`/panel/academia/${ruta}/${p.id}`, { metodo: "DELETE", conSesion: true });
      setOk(`Se eliminó «${p.nombre}».`);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo eliminar."));
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Migas items={[{ texto: "Academia" }, { texto: titulo }]} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold tracking-tight">{titulo}</h1>
        {textos && (
          <button type="button" className={BOTON} onClick={nuevoCurso}>
            + Nuevo {textos.uno}
          </button>
        )}
        {pestana === "categorias" && (
          <button
            type="button"
            className={BOTON}
            onClick={() => {
              limpiarAvisos();
              const orden = Math.max(0, ...categorias.map((c) => c.orden)) + 1;
              setCategoria({ id: null, nombre: "", descripcion: "", orden: String(orden) });
            }}
          >
            + Nueva categoría
          </button>
        )}
      </div>

      <div className="mb-3 space-y-2">
        <Aviso ok={ok} error={error} />
        {porEliminar && (
          <div
            role="alertdialog"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm"
          >
            <span className="flex-1">¿Eliminar «{porEliminar.nombre}»?</span>
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

      {textos && curso && (
        <form onSubmit={guardarCurso} className="mb-6">
          <Caja className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className={ETIQUETA}>Título</span>
              <input
                id="curso-titulo"
                className={ENTRADA}
                required
                minLength={3}
                maxLength={120}
                value={curso.titulo}
                onChange={(e) => setCurso({ ...curso, titulo: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className={ETIQUETA}>Categoría</span>
              <select
                id="curso-categoria"
                className={ENTRADA}
                required
                value={curso.categoria_id}
                onChange={(e) => setCurso({ ...curso, categoria_id: e.target.value })}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            {!esSistema && (
              <label className="block text-sm">
                <span className={ETIQUETA}>Nivel</span>
                <select
                  id="curso-nivel"
                  className={ENTRADA}
                  value={curso.nivel}
                  onChange={(e) => setCurso({ ...curso, nivel: e.target.value as Nivel })}
                >
                  {Object.entries(NIVELES).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm">
              <span className={ETIQUETA}>Precio anterior $ (tachado, opcional)</span>
              <input
                id="curso-precio-anterior"
                className={ENTRADA}
                type="number"
                min="0"
                step="0.01"
                value={curso.precio_anterior}
                onChange={(e) => setCurso({ ...curso, precio_anterior: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className={ETIQUETA}>Precio actual $ (0 = gratis)</span>
              <input
                id="curso-precio"
                className={ENTRADA}
                type="number"
                min="0"
                step="0.01"
                required
                value={curso.precio}
                onChange={(e) => setCurso({ ...curso, precio: e.target.value })}
              />
            </label>
            {textos.tipo === "curso" && (
              <label className="block text-sm">
                <span className={ETIQUETA}>Horas de video (opcional)</span>
                <input
                  id="curso-horas"
                  className={ENTRADA}
                  type="number"
                  min="1"
                  max="999"
                  value={curso.horas}
                  onChange={(e) => setCurso({ ...curso, horas: e.target.value })}
                />
              </label>
            )}
            <label className="block text-sm">
              <span className={ETIQUETA}>
                {curso.portada ? "Cambiar portada" : "Portada"} (se recorta a 1200 × 630)
              </span>
              <input
                id="curso-portada"
                className={ENTRADA}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPortada(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className={ETIQUETA}>
                Enlace al material (Drive u otro). Obligatorio si es gratis; si es de pago no se muestra.
              </span>
              <input
                id="curso-enlace"
                className={ENTRADA}
                type="url"
                maxLength={500}
                placeholder="https://drive.google.com/…"
                required={Number(curso.precio) === 0 && curso.precio !== ""}
                value={curso.enlace}
                onChange={(e) => setCurso({ ...curso, enlace: e.target.value })}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className={ETIQUETA}>Descripción</span>
              <textarea
                id="curso-descripcion"
                className={ENTRADA}
                rows={3}
                required
                minLength={10}
                maxLength={2000}
                value={curso.descripcion}
                onChange={(e) => setCurso({ ...curso, descripcion: e.target.value })}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className={ETIQUETA}>{textos.contenido} (uno por línea)</span>
              <textarea
                id="curso-temario"
                className={ENTRADA}
                rows={5}
                maxLength={5000}
                value={curso.temario}
                onChange={(e) => setCurso({ ...curso, temario: e.target.value })}
              />
            </label>
            {esSistema && (
              <>
                <label className="block text-sm sm:col-span-2">
                  <span className={ETIQUETA}>Tecnologías (separadas por coma)</span>
                  <input
                    id="curso-tecnologias"
                    className={ENTRADA}
                    maxLength={300}
                    placeholder="Python, FastAPI, PostgreSQL"
                    value={curso.tecnologias}
                    onChange={(e) => setCurso({ ...curso, tecnologias: e.target.value })}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className={ETIQUETA}>Cómo instalar</span>
                  <textarea
                    id="curso-instalacion"
                    className={ENTRADA}
                    rows={5}
                    maxLength={10000}
                    value={curso.instalacion}
                    onChange={(e) => setCurso({ ...curso, instalacion: e.target.value })}
                  />
                </label>
              </>
            )}
            <div className="flex flex-wrap items-center gap-5 text-sm sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  id="curso-publicado"
                  type="checkbox"
                  checked={curso.publicado}
                  onChange={(e) => setCurso({ ...curso, publicado: e.target.checked })}
                />
                Publicado
              </label>
              <label className="flex items-center gap-2">
                <input
                  id="curso-destacado"
                  type="checkbox"
                  checked={curso.destacado}
                  onChange={(e) => setCurso({ ...curso, destacado: e.target.checked })}
                />
                Destacado
              </label>
              <span className="flex-1" />
              <button type="button" onClick={() => setCurso(null)} className="rounded-md border border-borde px-4 py-2">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className={`${BOTON} disabled:opacity-60`}>
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </Caja>
        </form>
      )}

      {pestana === "categorias" && categoria && (
        <form onSubmit={guardarCategoria} className="mb-6">
          <Caja className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_100px]">
            <label className="block text-sm">
              <span className={ETIQUETA}>Nombre</span>
              <input
                id="academia-categoria-nombre"
                className={ENTRADA}
                required
                minLength={2}
                maxLength={60}
                value={categoria.nombre}
                onChange={(e) => setCategoria({ ...categoria, nombre: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className={ETIQUETA}>Descripción (opcional)</span>
              <input
                id="academia-categoria-descripcion"
                className={ENTRADA}
                maxLength={300}
                value={categoria.descripcion}
                onChange={(e) => setCategoria({ ...categoria, descripcion: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className={ETIQUETA}>Orden</span>
              <input
                id="academia-categoria-orden"
                className={ENTRADA}
                type="number"
                min="0"
                max="999"
                value={categoria.orden}
                onChange={(e) => setCategoria({ ...categoria, orden: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-3 sm:col-span-3">
              <button
                type="button"
                onClick={() => setCategoria(null)}
                className="rounded-md border border-borde px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button type="submit" className={BOTON}>
                Guardar categoría
              </button>
            </div>
          </Caja>
        </form>
      )}

      {pestana === "etiquetas" && <Etiquetas />}
      {pestana === "publicidad" && <Anuncios />}

      {textos && (
        <Caja className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borde">
                <th className={TH}>{textos.uno}</th>
                <th className={TH}>Categoría</th>
                {!esSistema && <th className={TH}>Nivel</th>}
                <th className={TH}>Precio</th>
                <th className={TH}>Estado</th>
                <th className={TH}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(cursos ?? []).map((c) => (
                <tr key={c.id} className="border-b border-borde last:border-0">
                  <td className={`${TD} font-medium`}>{c.titulo}</td>
                  <td className={TD}>{c.categoria.nombre}</td>
                  {!esSistema && <td className={TD}>{NIVELES[c.nivel]}</td>}
                  <td className={TD}>{precioTexto(c.precio)}</td>
                  <td className={TD}>
                    {c.publicado ? "Publicado" : "Borrador"}
                    {c.destacado && " · Destacado"}
                  </td>
                  <td className={TD}>
                    <GrupoAcciones>
                      <BotonAccion
                        tipo="editar"
                        titulo={`Editar ${c.titulo}`}
                        onClick={() => {
                          limpiarAvisos();
                          setPortada(null);
                          setCurso(aBorrador(c));
                        }}
                      />
                      <BotonAccion
                        tipo="eliminar"
                        titulo={`Eliminar ${c.titulo}`}
                        onClick={() => setPorEliminar({ tipo: "curso", id: c.id, nombre: c.titulo })}
                      />
                    </GrupoAcciones>
                  </td>
                </tr>
              ))}
              {cursos?.length === 0 && (
                <tr>
                  <td colSpan={esSistema ? 5 : 6} className={`${TD} text-center text-texto-2`}>
                    Todavía no hay nada aquí. Crea el primero con «+ Nuevo {textos.uno}».
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Caja>
      )}
      {pestana === "categorias" && (
        <Caja className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borde">
                <th className={TH}>Orden</th>
                <th className={TH}>Nombre</th>
                <th className={TH}>Cursos publicados</th>
                <th className={TH}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id} className="border-b border-borde last:border-0">
                  <td className={TD}>{c.orden}</td>
                  <td className={`${TD} font-medium`}>{c.nombre}</td>
                  <td className={TD}>{c.cursos}</td>
                  <td className={TD}>
                    <GrupoAcciones>
                      <BotonAccion
                        tipo="editar"
                        titulo={`Editar ${c.nombre}`}
                        onClick={() => {
                          limpiarAvisos();
                          setCategoria({
                            id: c.id,
                            nombre: c.nombre,
                            descripcion: c.descripcion ?? "",
                            orden: String(c.orden),
                          });
                        }}
                      />
                      <BotonAccion
                        tipo="eliminar"
                        titulo={`Eliminar ${c.nombre}`}
                        onClick={() => setPorEliminar({ tipo: "categoria", id: c.id, nombre: c.nombre })}
                      />
                    </GrupoAcciones>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Caja>
      )}
    </div>
  );
}
