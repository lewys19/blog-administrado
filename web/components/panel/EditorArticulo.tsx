"use client";

// Editor de artículos: Markdown con barra de formato y vista previa, portada, categoría y etiquetas,
// estado según el rol (borrador, revisión, programado, publicado) y la caja de SEO con su vista en Google.
import Link from "next/link";
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { puede, usePanel } from "@/components/panel/Panel";
import { Aviso, Caja } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import { GenerarConIA } from "@/components/panel/GenerarConIA";
import type { ArticuloEditor, Categoria, EstadoArticulo } from "@/lib/tipos";

const ENTRADA = "w-full rounded-lg border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca";

function slug(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 170);
}

/** "2026-10-30T09:00" para <input type="datetime-local"> en la hora de quien escribe. */
function aLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function Contador({ n, ideal, max }: { n: number; ideal: number; max: number }) {
  const color = n === 0 ? "text-texto-2" : n > ideal ? "text-aviso" : "text-marca-fuerte";
  return (
    <span className={`font-mono text-xs ${color}`}>
      {n}/{ideal}
      {n > ideal && n <= max && " · largo para Google"}
    </span>
  );
}

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: ReactNode; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-baseline justify-between gap-2 font-medium text-texto-2">
        {etiqueta}
        {ayuda}
      </span>
      {children}
    </label>
  );
}

// Botones de formato: envuelven la selección del texto con la sintaxis de Markdown.
const FORMATOS: { titulo: string; icono: string; antes: string; despues?: string; linea?: boolean }[] = [
  { titulo: "Subtítulo", icono: "H2", antes: "## ", linea: true },
  { titulo: "Negrita", icono: "B", antes: "**", despues: "**" },
  { titulo: "Cursiva", icono: "I", antes: "_", despues: "_" },
  { titulo: "Código en línea", icono: "`", antes: "`", despues: "`" },
  { titulo: "Bloque de código", icono: "{ }", antes: "\n```python\n", despues: "\n```\n" },
  { titulo: "Enlace", icono: "🔗", antes: "[", despues: "](https://)" },
  { titulo: "Lista", icono: "•", antes: "- ", linea: true },
  { titulo: "Cita", icono: "❝", antes: "> ", linea: true },
];

export function EditorArticulo({ inicial }: { inicial: ArticuloEditor | null }) {
  const yo = usePanel();
  const publica = puede(yo, "articulos.publicar");
  const area = useRef<HTMLTextAreaElement>(null);

  const [a, setA] = useState<ArticuloEditor | null>(inicial);
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [slugPropio, setSlugPropio] = useState(inicial?.slug ?? "");
  const [slugEditado, setSlugEditado] = useState(!!inicial);
  const [resumen, setResumen] = useState(inicial?.resumen ?? "");
  const [contenido, setContenido] = useState(inicial?.contenido ?? "");
  const [categoriaId, setCategoriaId] = useState(inicial?.categoria_id ? String(inicial.categoria_id) : "");
  const [etiquetas, setEtiquetas] = useState(inicial?.etiquetas.join(", ") ?? "");
  const [destacado, setDestacado] = useState(inicial?.destacado ?? false);
  const [programarPara, setProgramarPara] = useState(
    inicial?.estado === "programado" ? aLocal(inicial.publicado_en) : "",
  );
  const [metaTitulo, setMetaTitulo] = useState(inicial?.meta_titulo ?? "");
  const [metaDescripcion, setMetaDescripcion] = useState(inicial?.meta_descripcion ?? "");
  const [palabras, setPalabras] = useState(inicial?.palabras_clave ?? "");
  const [pestana, setPestana] = useState<"escribir" | "ver">("escribir");
  const [previa, setPrevia] = useState<{ html: string; minutos_lectura: number } | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pedir<Categoria[]>("/panel/categorias", { conSesion: true })
      .then(setCategorias)
      .catch(() => {});
  }, []);

  const slugFinal = slugEditado ? slug(slugPropio) : slug(titulo);

  async function verPrevia() {
    setPestana("ver");
    setPrevia(null);
    try {
      setPrevia(
        await pedir("/panel/articulos/vista-previa", { metodo: "POST", conSesion: true, cuerpo: { contenido } }),
      );
    } catch {
      setPrevia({ html: "<p>No se pudo generar la vista previa.</p>", minutos_lectura: 0 });
    }
  }

  function formatear(f: (typeof FORMATOS)[number]) {
    const t = area.current;
    if (!t) return;
    const { selectionStart: i, selectionEnd: j } = t;
    const elegido = contenido.slice(i, j);
    const inicioLinea = f.linea ? contenido.lastIndexOf("\n", i - 1) + 1 : i;
    const nuevo = f.linea
      ? contenido.slice(0, inicioLinea) + f.antes + contenido.slice(inicioLinea)
      : contenido.slice(0, i) + f.antes + elegido + (f.despues ?? "") + contenido.slice(j);
    setContenido(nuevo);
    requestAnimationFrame(() => {
      t.focus();
      const cursor = f.linea ? j + f.antes.length : i + f.antes.length + elegido.length;
      t.setSelectionRange(cursor, cursor);
    });
  }

  async function guardar(estado: EstadoArticulo, e?: FormEvent) {
    e?.preventDefault();
    setOk(null);
    setError(null);
    if (titulo.trim().length < 3) return setError("Escribe un título de al menos 3 letras.");
    if (estado === "programado" && !programarPara) return setError("Elige la fecha y hora en que debe publicarse.");
    setGuardando(true);
    const cuerpo = {
      titulo,
      slug: slugFinal || null,
      resumen: resumen || null,
      contenido,
      categoria_id: categoriaId ? Number(categoriaId) : null,
      etiquetas: etiquetas
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      estado,
      publicado_en: estado === "programado" ? new Date(programarPara).toISOString() : null,
      destacado,
      meta_titulo: metaTitulo || null,
      meta_descripcion: metaDescripcion || null,
      palabras_clave: palabras || null,
    };
    try {
      const guardado = await pedir<ArticuloEditor>(a ? `/panel/articulos/${a.id}` : "/panel/articulos", {
        metodo: a ? "PUT" : "POST",
        conSesion: true,
        cuerpo,
      });
      setA(guardado);
      setSlugPropio(guardado.slug);
      setSlugEditado(true);
      const mensajes: Record<EstadoArticulo, string> = {
        borrador: "Borrador guardado.",
        revision: "Enviado a revisión: un Editor lo publicará.",
        programado: "Programado: se publicará solo en la fecha elegida.",
        publicado: "¡Publicado! Ya se ve en el blog.",
      };
      setOk(mensajes[estado]);
      // La dirección pasa a /admin/articulos/<id> sin volver a montar el editor (no se pierde el aviso).
      if (!a) window.history.replaceState(null, "", `/admin/articulos/${guardado.id}`);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function subirPortada(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo || !a) return;
    const cuerpo = new FormData();
    cuerpo.append("foto", archivo);
    setError(null);
    try {
      setA(await pedir<ArticuloEditor>(`/panel/articulos/${a.id}/imagen`, { metodo: "PUT", conSesion: true, cuerpo }));
      setOk("Portada guardada.");
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo subir la imagen.");
    }
  }

  const tituloGoogle = metaTitulo || titulo || "Título del artículo";
  const descripcionGoogle =
    metaDescripcion ||
    resumen ||
    "Agrega un resumen o una meta descripción: es lo que la gente lee en Google antes de entrar.";
  const estadoActual = a?.estado ?? "borrador";

  return (
    <form
      onSubmit={(e) => guardar(estadoActual === "publicado" ? "publicado" : "borrador", e)}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="min-w-0 space-y-4">
        {puede(yo, "ia.usar") && (
          <GenerarConIA
            hayTexto={!!(titulo.trim() || contenido.trim())}
            alGenerar={(b) => {
              setTitulo(b.titulo);
              setResumen(b.resumen);
              setContenido(b.contenido);
              setEtiquetas(b.etiquetas.join(", "));
              if (!a) setSlugEditado(false); // en uno nuevo, la URL se arma del título generado
              setPestana("escribir");
              setOk("Borrador generado: revísalo y guárdalo.");
            }}
          />
        )}
        <input
          id="articulo-titulo"
          aria-label="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={160}
          placeholder="Título del artículo"
          className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-texto-2/50"
        />
        <div className="flex flex-wrap items-center gap-2 text-sm text-texto-2">
          <span>URL:</span>
          <span className="font-mono">/blog/</span>
          <input
            id="articulo-slug"
            aria-label="URL amigable"
            value={slugEditado ? slugPropio : slugFinal}
            onChange={(e) => {
              setSlugEditado(true);
              setSlugPropio(e.target.value);
            }}
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 font-mono text-texto outline-none focus:border-borde"
          />
        </div>
        <Campo
          etiqueta="Resumen (bajada bajo el título y en las tarjetas)"
          ayuda={<Contador n={resumen.length} ideal={160} max={400} />}
        >
          <textarea
            id="articulo-resumen"
            rows={2}
            maxLength={400}
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            className={ENTRADA}
          />
        </Campo>

        <Caja>
          <div className="flex flex-wrap items-center gap-1 border-b border-borde px-2 py-1.5">
            <div role="tablist" className="mr-2 flex rounded-md bg-fondo p-0.5 text-sm">
              <button
                type="button"
                role="tab"
                aria-selected={pestana === "escribir"}
                onClick={() => setPestana("escribir")}
                className={`rounded px-3 py-1 ${pestana === "escribir" ? "bg-superficie font-semibold shadow-sm" : "text-texto-2"}`}
              >
                Escribir
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pestana === "ver"}
                onClick={verPrevia}
                className={`rounded px-3 py-1 ${pestana === "ver" ? "bg-superficie font-semibold shadow-sm" : "text-texto-2"}`}
              >
                Vista previa
              </button>
            </div>
            {pestana === "escribir" &&
              FORMATOS.map((f) => (
                <button
                  key={f.titulo}
                  type="button"
                  title={f.titulo}
                  aria-label={f.titulo}
                  onClick={() => formatear(f)}
                  className="min-w-8 rounded px-2 py-1 font-mono text-sm text-texto-2 hover:bg-fondo hover:text-texto"
                >
                  {f.icono}
                </button>
              ))}
          </div>
          {pestana === "escribir" ? (
            <textarea
              id="articulo-contenido"
              ref={area}
              aria-label="Contenido en Markdown"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder={
                "Escribe en Markdown.\n\n## Un subtítulo\n\nTexto con **negrita** y `código`.\n\n```python\nprint('hola')\n```"
              }
              className="min-h-[28rem] w-full resize-y bg-superficie p-4 font-mono text-sm leading-relaxed outline-none"
            />
          ) : (
            <div className="min-h-[28rem] p-6">
              {previa ? (
                <>
                  <p className="mb-4 font-mono text-xs text-texto-2">{previa.minutos_lectura} min de lectura</p>
                  <div className="contenido" dangerouslySetInnerHTML={{ __html: previa.html }} />
                </>
              ) : (
                <p className="text-texto-2">Generando vista previa…</p>
              )}
            </div>
          )}
        </Caja>
      </div>

      <aside className="space-y-4">
        <Caja className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Publicación</h2>
            <span className="rounded-full bg-fondo px-2.5 py-0.5 font-mono text-xs ring-1 ring-borde">
              {estadoActual}
            </span>
          </div>
          <Aviso ok={ok} error={error} />
          <div className="grid gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={() => guardar("borrador")}
              className="rounded-lg border border-borde px-3 py-2 text-sm font-semibold hover:bg-fondo disabled:opacity-60"
            >
              Guardar borrador
            </button>
            {publica ? (
              <>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => guardar("publicado")}
                  className="rounded-lg bg-marca px-3 py-2 text-sm font-semibold text-sobre-marca hover:bg-marca-fuerte disabled:opacity-60"
                >
                  {estadoActual === "publicado" ? "Guardar cambios publicados" : "Publicar ahora"}
                </button>
                <div className="flex gap-2">
                  <input
                    id="articulo-programar"
                    type="datetime-local"
                    aria-label="Fecha y hora de publicación"
                    value={programarPara}
                    onChange={(e) => setProgramarPara(e.target.value)}
                    className={`${ENTRADA} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => guardar("programado")}
                    className="rounded-lg bg-lateral px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Programar
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    id="articulo-destacado"
                    type="checkbox"
                    checked={destacado}
                    onChange={(e) => setDestacado(e.target.checked)}
                    className="accent-[var(--marca)]"
                  />
                  Destacado en la portada
                </label>
              </>
            ) : (
              <button
                type="button"
                disabled={guardando}
                onClick={() => guardar("revision")}
                className="rounded-lg bg-marca px-3 py-2 text-sm font-semibold text-sobre-marca hover:bg-marca-fuerte disabled:opacity-60"
              >
                Enviar a revisión
              </button>
            )}
            {a && (estadoActual === "publicado" || estadoActual === "programado") && (
              <Link
                href={`/blog/${a.slug}`}
                target="_blank"
                className="text-center text-sm text-marca-fuerte hover:underline"
              >
                Ver en el blog ↗
              </Link>
            )}
          </div>
        </Caja>

        <Caja className="space-y-3 p-4">
          <h2 className="font-bold">Clasificación</h2>
          <Campo etiqueta="Categoría">
            <select
              id="articulo-categoria"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className={ENTRADA}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.padre_id ? "— " : ""}
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Etiquetas (separadas por comas)">
            <input
              id="articulo-etiquetas"
              value={etiquetas}
              onChange={(e) => setEtiquetas(e.target.value)}
              placeholder="docker, postgresql"
              className={ENTRADA}
            />
          </Campo>
        </Caja>

        <Caja className="space-y-3 p-4">
          <h2 className="font-bold">Portada</h2>
          {a?.imagen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.imagen}
              alt=""
              className="aspect-[1200/630] w-full rounded-lg border border-borde object-cover"
            />
          )}
          {a ? (
            <label className="block cursor-pointer rounded-lg border border-dashed border-borde px-3 py-2 text-center text-sm hover:border-marca">
              {a.imagen ? "Cambiar imagen" : "Subir imagen (se recorta a 1200 × 630)"}
              <input id="articulo-portada" type="file" accept="image/*" className="sr-only" onChange={subirPortada} />
            </label>
          ) : (
            <p className="text-sm text-texto-2">Guarda el borrador para poder subir la portada.</p>
          )}
        </Caja>

        <Caja className="space-y-3 p-4">
          <h2 className="font-bold">SEO</h2>
          <div className="rounded-lg border border-borde bg-fondo p-3" aria-label="Así se verá en Google">
            <p className="truncate text-xs text-texto-2">zcorp-stack › blog › {slugFinal || "…"}</p>
            <p className="truncate text-[15px] text-[#1a0dab] dark:text-[#8ab4f8]">{tituloGoogle}</p>
            <p className="line-clamp-2 text-xs text-texto-2">{descripcionGoogle}</p>
          </div>
          <Campo etiqueta="Meta título" ayuda={<Contador n={metaTitulo.length} ideal={60} max={70} />}>
            <input
              id="articulo-meta-titulo"
              maxLength={70}
              value={metaTitulo}
              onChange={(e) => setMetaTitulo(e.target.value)}
              placeholder={titulo || "Si lo dejas vacío, se usa el título"}
              className={ENTRADA}
            />
          </Campo>
          <Campo etiqueta="Meta descripción" ayuda={<Contador n={metaDescripcion.length} ideal={155} max={170} />}>
            <textarea
              id="articulo-meta-descripcion"
              rows={3}
              maxLength={170}
              value={metaDescripcion}
              onChange={(e) => setMetaDescripcion(e.target.value)}
              placeholder="Si la dejas vacía, se usa el resumen"
              className={ENTRADA}
            />
          </Campo>
          <Campo etiqueta="Palabras clave">
            <input
              id="articulo-palabras"
              maxLength={200}
              value={palabras}
              onChange={(e) => setPalabras(e.target.value)}
              placeholder="fastapi, api rest, python"
              className={ENTRADA}
            />
          </Campo>
        </Caja>
      </aside>
    </form>
  );
}
