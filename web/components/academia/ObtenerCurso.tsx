"use client";

import { type FormEvent, useState } from "react";

import { ICONOS, Icono } from "@/components/blog/Iconos";
import { enlaceWhatsapp } from "@/lib/academia";
import { ErrorApi, pedir } from "@/lib/api";
import type { CursoTarjeta } from "@/lib/tipos";

const BOTON =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-marca px-4 py-2.5 text-sm font-semibold text-sobre-marca hover:bg-marca-fuerte disabled:opacity-60";
const CAMPO = "w-full rounded-lg border border-borde bg-pagina px-3 py-2 text-sm";

type Acceso = { estado: "pendiente" | "aprobada" | "rechazada"; enlace: string | null };

/** Gratis: lleva al material. De pago: genera un código que el administrador aprueba al confirmar el pago. */
export function ObtenerCurso({ curso, whatsapp }: { curso: CursoTarjeta; whatsapp: string }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [generado, setGenerado] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [enlace, setEnlace] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (curso.enlace) {
    return (
      <a href={curso.enlace} target="_blank" rel="noreferrer" className={BOTON}>
        <Icono d={ICONOS.enlace} className="h-4 w-4" /> Obtener gratis
      </a>
    );
  }

  async function generar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const r = await pedir<{ codigo: string }>(`/academia/cursos/${encodeURIComponent(curso.slug)}/solicitudes`, {
        metodo: "POST",
        cuerpo: { nombre, whatsapp: telefono },
      });
      setGenerado(r.codigo);
      setCodigo(r.codigo);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo generar tu código.");
    } finally {
      setEnviando(false);
    }
  }

  async function acceder(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      const r = await pedir<Acceso>("/academia/acceso", { metodo: "POST", cuerpo: { codigo } });
      if (r.estado === "aprobada" && r.enlace) setEnlace(r.enlace);
      else if (r.estado === "rechazada") setError("Este código fue rechazado. Escríbenos por WhatsApp.");
      else setAviso("Tu código sigue pendiente: lo aprobaremos al confirmar tu pago.");
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo comprobar tu código.");
    } finally {
      setEnviando(false);
    }
  }

  if (enlace) {
    return (
      <a href={enlace} target="_blank" rel="noreferrer" className={BOTON}>
        <Icono d={ICONOS.enlace} className="h-4 w-4" /> Abrir mi material
      </a>
    );
  }

  if (!abierto) {
    return (
      <button type="button" className={BOTON} onClick={() => setAbierto(true)}>
        Obtener
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {generado ? (
        <div className="space-y-3 rounded-lg bg-marca-suave p-4 text-sm">
          <p>Tu código es:</p>
          <p className="font-mono text-lg font-bold text-marca-fuerte select-all">{generado}</p>
          <p className="text-texto-2">
            Envíalo por WhatsApp para coordinar el pago. Guárdalo: lo necesitas para entrar.
          </p>
          <a href={enlaceWhatsapp(whatsapp, curso, generado)} target="_blank" rel="noreferrer" className={BOTON}>
            <Icono d={ICONOS.whatsapp} className="h-4 w-4" /> Enviar por WhatsApp
          </a>
        </div>
      ) : (
        <form onSubmit={generar} className="space-y-2">
          <p className="text-sm text-texto-2">Déjanos tus datos para generar tu código de compra.</p>
          <input
            id="solicitud-nombre"
            required
            minLength={2}
            maxLength={80}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            className={CAMPO}
          />
          <input
            id="solicitud-whatsapp"
            required
            type="tel"
            maxLength={20}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Tu WhatsApp"
            aria-label="Tu WhatsApp"
            className={CAMPO}
          />
          <button type="submit" disabled={enviando} className={BOTON}>
            Generar mi código
          </button>
        </form>
      )}
      <form onSubmit={acceder} className="space-y-2 border-t border-borde pt-3">
        <label htmlFor="acceso-codigo" className="block text-sm font-medium">
          ¿Ya te aprobamos? Pon tu código
        </label>
        <div className="flex gap-2">
          <input
            id="acceso-codigo"
            required
            maxLength={20}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="ZC-XXXX-XXXX"
            className={`${CAMPO} font-mono uppercase`}
          />
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg border border-borde px-3 text-sm font-semibold hover:border-marca disabled:opacity-60"
          >
            Entrar
          </button>
        </div>
      </form>
      {aviso && (
        <p role="status" className="text-sm text-texto-2">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
