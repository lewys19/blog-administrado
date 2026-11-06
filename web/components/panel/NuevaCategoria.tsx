"use client";

import { useState } from "react";

import { ErrorApi, pedir } from "@/lib/api";

/** Crea una categoría sin salir del formulario. `ruta`: la del blog o la de la Academia. */
export function NuevaCategoria<T>({
  ruta = "/panel/categorias",
  alCrear,
  alCancelar,
}: {
  ruta?: string;
  alCrear: (categoria: T) => void;
  alCancelar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    if (nombre.trim().length < 2) return setError("Escribe al menos 2 letras.");
    setError(null);
    setCreando(true);
    try {
      alCrear(
        await pedir<T>(ruta, {
          metodo: "POST",
          conSesion: true,
          cuerpo: { nombre: nombre.trim() },
        }),
      );
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo crear la categoría.");
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <input
        id="categoria-nueva"
        aria-label="Nombre de la categoría nueva"
        autoFocus
        value={nombre}
        maxLength={60}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            crear();
          }
        }}
        placeholder="Nombre de la categoría"
        className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={creando}
          onClick={crear}
          className="flex-1 rounded-lg bg-marca px-3 py-1.5 text-sm font-semibold text-sobre-marca hover:bg-marca-fuerte disabled:opacity-60"
        >
          {creando ? "Creando…" : "Crear"}
        </button>
        <button
          type="button"
          onClick={alCancelar}
          className="rounded-lg border border-borde px-3 py-1.5 text-sm hover:bg-fondo"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
