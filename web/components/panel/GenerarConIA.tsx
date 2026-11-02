"use client";

// Panel plegable sobre el título: pide un tema y rellena el editor con el borrador que escribe Claude.
// No guarda nada: la persona revisa y guarda como siempre.

import { useState } from "react";

import { ErrorApi, pedir } from "@/lib/api";

export interface Borrador {
  titulo: string;
  resumen: string;
  contenido: string;
  etiquetas: string[];
}

const ENTRADA = "w-full rounded-lg border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca";

export function GenerarConIA({ hayTexto, alGenerar }: { hayTexto: boolean; alGenerar: (b: Borrador) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [tema, setTema] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [palabras, setPalabras] = useState(1000);
  const [generando, setGenerando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    setError(null);
    if (tema.trim().length < 5) return setError("Escribe el tema con un poco más de detalle.");
    // Si ya hay texto, se pide confirmar dentro del panel antes de reemplazarlo.
    if (hayTexto && !confirmar) return setConfirmar(true);
    setConfirmar(false);
    setGenerando(true);
    try {
      const b = await pedir<Borrador>("/panel/ia/borrador", {
        metodo: "POST",
        conSesion: true,
        cuerpo: { tema, indicaciones: indicaciones || null, palabras },
        limiteMs: 300_000,
      });
      alGenerar(b);
      setAbierto(false);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo generar. Prueba de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-marca/40 bg-marca/10 px-3 py-2 text-sm font-semibold text-marca hover:bg-marca/20"
      >
        ✨ Generar con IA
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-marca/40 bg-marca/5 p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">✨ Generar borrador con IA</p>
        <button type="button" onClick={() => setAbierto(false)} className="text-sm text-texto-2 hover:text-texto">
          Cerrar
        </button>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Tema</span>
        <input
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          maxLength={300}
          placeholder="Ej.: Cómo crear una API REST con FastAPI paso a paso"
          className={ENTRADA}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Indicaciones (opcional)</span>
        <textarea
          value={indicaciones}
          onChange={(e) => setIndicaciones(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Ej.: para principiantes, con ejemplos en Python y una sección de errores comunes"
          className={ENTRADA}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span>Largo aproximado</span>
        <select value={palabras} onChange={(e) => setPalabras(Number(e.target.value))} className="rounded-lg border border-borde bg-superficie px-2 py-1">
          <option value={600}>Corto (600 palabras)</option>
          <option value={1000}>Medio (1000 palabras)</option>
          <option value={1800}>Largo (1800 palabras)</option>
        </select>
      </label>

      {confirmar && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm">
          El editor ya tiene texto: el borrador reemplazará el título, el resumen, el contenido y las etiquetas. Pulsa
          «Generar» otra vez para seguir.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={generar}
        disabled={generando}
        className="rounded-lg bg-marca px-3 py-2 text-sm font-semibold text-sobre-marca hover:bg-marca-fuerte disabled:opacity-60"
      >
        {generando ? "Escribiendo… (puede tardar 1-2 minutos)" : "Generar"}
      </button>
      <p className="text-xs text-texto-2">La IA puede equivocarse: revisa datos, versiones y código antes de publicar.</p>
    </div>
  );
}
