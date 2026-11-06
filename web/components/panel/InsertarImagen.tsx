"use client";

import { type ChangeEvent, useState } from "react";

import { ErrorApi, pedir } from "@/lib/api";
import { esUrlImagen, imagenMarkdown } from "@/lib/formato";

const CAMPO = "w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm";

/** Botón del editor: agrega una imagen al texto, subida desde la PC o por dirección. */
export function InsertarImagen({ alInsertar }: { alInsertar: (markdown: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [url, setUrl] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function terminar(direccion: string) {
    alInsertar(imagenMarkdown(descripcion, direccion));
    setDescripcion("");
    setUrl("");
    setError(null);
    setAbierto(false);
  }

  async function subir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    const cuerpo = new FormData();
    cuerpo.append("foto", archivo);
    setError(null);
    setSubiendo(true);
    try {
      const r = await pedir<{ url: string }>("/panel/imagenes", { metodo: "POST", conSesion: true, cuerpo });
      terminar(r.url);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  }

  function usarUrl() {
    if (!esUrlImagen(url)) return setError("Pega una dirección que empiece con https://");
    terminar(url);
  }

  return (
    <div className="relative">
      <button
        type="button"
        title="Imagen"
        aria-label="Imagen"
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
        className="min-w-8 rounded px-2 py-1 font-mono text-sm text-texto-2 hover:bg-fondo hover:text-texto"
      >
        🖼️
      </button>
      {abierto && (
        <div className="absolute left-0 z-20 mt-2 w-80 max-w-[85vw] space-y-3 rounded-lg border border-borde bg-superficie p-4 shadow-lg">
          <label className="block text-sm font-medium">
            Descripción de la imagen
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={150}
              placeholder="Qué se ve en la imagen"
              className={`${CAMPO} mt-1 font-normal`}
            />
          </label>
          <label className="block cursor-pointer rounded-lg bg-marca px-3 py-2 text-center text-sm font-semibold text-sobre-marca hover:bg-marca-fuerte">
            {subiendo ? "Subiendo…" : "Subir desde mi PC"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={subiendo}
              className="sr-only"
              onChange={subir}
            />
          </label>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/imagen.png"
              aria-label="Dirección de la imagen"
              className={CAMPO}
            />
            <button
              type="button"
              onClick={usarUrl}
              className="rounded-lg border border-borde px-3 text-sm font-medium hover:border-marca"
            >
              Insertar
            </button>
          </div>
          <p className="text-xs text-texto-2">JPG, PNG o WebP de hasta 8 MB.</p>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
