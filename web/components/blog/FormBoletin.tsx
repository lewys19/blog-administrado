"use client";

import { useState } from "react";

import { ErrorApi, pedir } from "@/lib/api";

/** Suscribirse al boletín: manda el correo de confirmación (doble confirmación). */
export function FormBoletin() {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const datos = new FormData(formulario);
    setEnviando(true);
    setAviso(null);
    try {
      const r = await pedir<{ mensaje: string }>("/newsletter/suscribir", {
        metodo: "POST",
        cuerpo: { correo: String(datos.get("correo") ?? ""), sitio_web: datos.get("sitio_web") || null },
      });
      setAviso({ ok: true, texto: r.mensaje });
      formulario.reset();
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
    <form onSubmit={enviar} className="mt-4 space-y-2">
      <label htmlFor="boletin-correo" className="sr-only">
        Tu correo electrónico
      </label>
      <input
        id="boletin-correo"
        name="correo"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        placeholder="Tu correo electrónico"
        className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
      />
      {/* Trampa para robots: oculta para las personas y los lectores de pantalla. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <input name="sitio_web" tabIndex={-1} autoComplete="off" />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-marca px-3 py-2 text-sm font-semibold text-white hover:bg-marca-fuerte disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Suscribirme"}
      </button>
      {aviso ? (
        <p
          role={aviso.ok ? "status" : "alert"}
          className={`rounded-lg px-3 py-2 text-xs ${aviso.ok ? "bg-marca-suave text-marca-fuerte" : "bg-error/10 text-error"}`}
        >
          {aviso.texto}
        </p>
      ) : (
        <p className="text-center text-xs text-texto-2">Sin spam. Te das de baja con un clic.</p>
      )}
    </form>
  );
}
