"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ErrorApi, pedir } from "@/lib/api";

type Estado = { tipo: "esperando" | "trabajando" } | { tipo: "listo" | "error"; texto: string };

/**
 * Confirmar: se hace sola al abrir el enlace del correo.
 * Baja: pide un clic (así los antivirus que abren los enlaces no dan de baja a nadie).
 */
export function AccionBoletin({ accion }: { accion: "confirmar" | "baja" }) {
  const token = useSearchParams().get("token") ?? "";
  const [estado, setEstado] = useState<Estado>({ tipo: accion === "confirmar" ? "trabajando" : "esperando" });
  const hecho = useRef(false);

  async function ejecutar() {
    setEstado({ tipo: "trabajando" });
    try {
      const r = await pedir<{ mensaje: string }>(`/newsletter/${accion}`, { metodo: "POST", cuerpo: { token } });
      setEstado({ tipo: "listo", texto: r.mensaje });
    } catch (e) {
      setEstado({
        tipo: "error",
        texto: e instanceof ErrorApi ? e.message : "No se pudo completar. Intenta otra vez.",
      });
    }
  }

  useEffect(() => {
    if (accion !== "confirmar" || hecho.current) return;
    hecho.current = true;
    if (!token) {
      queueMicrotask(() => setEstado({ tipo: "error", texto: "Falta el código del enlace. Ábrelo desde el correo." }));
      return;
    }
    queueMicrotask(ejecutar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      {estado.tipo === "trabajando" && <p className="text-texto-2">Un momento…</p>}
      {estado.tipo === "esperando" && (
        <>
          <p className="text-texto-2">¿Seguro que ya no quieres recibir los artículos nuevos en tu correo?</p>
          <button
            type="button"
            onClick={ejecutar}
            disabled={!token}
            className="rounded-lg bg-marca px-5 py-2.5 font-semibold text-white hover:bg-marca-fuerte disabled:opacity-60"
          >
            Sí, darme de baja
          </button>
        </>
      )}
      {(estado.tipo === "listo" || estado.tipo === "error") && (
        <p
          role={estado.tipo === "listo" ? "status" : "alert"}
          className={`rounded-xl px-4 py-3 ${estado.tipo === "listo" ? "bg-marca-suave text-marca-fuerte" : "bg-error/10 text-error"}`}
        >
          {estado.texto}
        </p>
      )}
      <Link href="/" className="inline-block text-sm font-semibold text-marca-fuerte hover:underline">
        ← Volver al blog
      </Link>
    </div>
  );
}
