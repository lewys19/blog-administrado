"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ErrorApi, pedir } from "@/lib/api";
import type { EstadoComentario } from "@/lib/tipos";

const MAXIMO = 2000;
const RECUERDO = "zcorp-comentarista"; // nombre y correo, solo en este navegador

const campo =
  "w-full rounded-lg border border-borde bg-pagina px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20";

export function FormComentario({ slug }: { slug: string }) {
  const router = useRouter();
  // Nombre y correo sin estado de React: se rellenan con lo recordado en este navegador.
  const nombreRef = useRef<HTMLInputElement>(null);
  const correoRef = useRef<HTMLInputElement>(null);
  const [contenido, setContenido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    try {
      const datos = JSON.parse(localStorage.getItem(RECUERDO) ?? "null");
      if (datos && nombreRef.current && correoRef.current) {
        nombreRef.current.value ||= datos.nombre ?? "";
        correoRef.current.value ||= datos.correo ?? "";
      }
    } catch {
      // sin almacenamiento: se escribe de nuevo
    }
  }, []);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const nombre = String(datos.get("nombre") ?? "");
    const correo = String(datos.get("correo") ?? "");
    const trampa = datos.get("sitio_web");
    setEnviando(true);
    setAviso(null);
    try {
      const r = await pedir<{ estado: EstadoComentario; mensaje: string }>(
        `/blog/articulos/${encodeURIComponent(slug)}/comentarios`,
        { metodo: "POST", cuerpo: { nombre, correo, contenido, sitio_web: trampa || null } },
      );
      setAviso({ ok: true, texto: r.mensaje });
      setContenido("");
      try {
        localStorage.setItem(RECUERDO, JSON.stringify({ nombre, correo }));
      } catch {
        // no importa
      }
      if (r.estado === "aprobado") router.refresh();
    } catch (error) {
      setAviso({
        ok: false,
        texto: error instanceof ErrorApi ? error.message : "No se pudo enviar. Intenta otra vez.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-3 border-t border-borde pt-5" aria-labelledby="dejar-comentario">
      <h3 id="dejar-comentario" className="font-bold">
        Deja tu comentario
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Nombre</span>
          <input
            name="nombre"
            required
            minLength={2}
            maxLength={60}
            autoComplete="name"
            ref={nombreRef}
            className={campo}
          />
        </label>
        <label className="text-sm">
          <span id="comentario-correo" className="mb-1 block font-medium">
            Correo
          </span>
          <input
            name="correo"
            aria-labelledby="comentario-correo"
            aria-describedby="comentario-correo-nota"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            ref={correoRef}
            className={campo}
          />
          <span id="comentario-correo-nota" className="mt-1 block text-xs text-texto-2">
            No se publica.
          </span>
        </label>
      </div>
      {/* Trampa para robots: oculta para las personas y los lectores de pantalla. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Sitio web
          <input name="sitio_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="block text-sm">
        <span id="comentario-texto" className="mb-1 block font-medium">
          Comentario
        </span>
        <textarea
          name="contenido"
          aria-labelledby="comentario-texto"
          required
          minLength={3}
          maxLength={MAXIMO}
          rows={4}
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          className={`${campo} resize-y`}
        />
        <span aria-hidden="true" className="mt-1 block text-right text-xs text-texto-2 tabular-nums">
          {contenido.length}/{MAXIMO}
        </span>
      </label>
      {aviso && (
        <p
          role={aviso.ok ? "status" : "alert"}
          className={`rounded-lg px-3 py-2 text-sm ${aviso.ok ? "bg-marca-suave text-marca-fuerte" : "bg-error/10 text-error"}`}
        >
          {aviso.texto}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-texto-2">Los comentarios se revisan antes de publicarse.</p>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-marca px-5 py-2 text-sm font-semibold text-white hover:bg-marca-fuerte disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Publicar comentario"}
        </button>
      </div>
    </form>
  );
}
