"use client";

// Cuenta las visitas del blog para las estadísticas del panel. Sin cookies y sin guardar la IP.
// Por cada página: avisa la visita y, al salir, cuánto rato estuvo a la vista y hasta dónde bajó.
// No cuenta a quien tiene sesión del panel (el equipo leyendo sus propios artículos).
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { leerSesion } from "@/lib/sesion";

const API = "/api/v1/estadisticas";

/** De dónde llegó: utm_source si viene en la URL; si no, el sitio anterior (nunca el propio). */
function referente(primera: boolean): string | null {
  const utm = new URLSearchParams(window.location.search).get("utm_source");
  if (utm) return utm;
  if (!primera || !document.referrer) return null;
  try {
    return new URL(document.referrer).host === window.location.host ? null : document.referrer;
  } catch {
    return null;
  }
}

let primeraPagina = true;

export function Contador() {
  const ruta = usePathname();

  useEffect(() => {
    if (leerSesion()?.usuario.en_panel) return;
    let id: string | null = null;
    let segundos = 0;
    let profundidad = 0;
    let visibleDesde = document.visibilityState === "visible" ? Date.now() : null;
    let informado = { segundos: -1, profundidad: -1 };

    const acumular = () => {
      if (visibleDesde !== null) segundos += (Date.now() - visibleDesde) / 1000;
      visibleDesde = document.visibilityState === "visible" ? Date.now() : null;
    };
    const medirScroll = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      const p = alto <= 0 ? 100 : Math.round((window.scrollY / alto) * 100);
      profundidad = Math.max(profundidad, Math.min(100, p));
    };
    const enviar = (visitaId: string) => {
      const datos = { id: visitaId, segundos: Math.round(segundos), profundidad };
      if (datos.segundos === informado.segundos && datos.profundidad === informado.profundidad) return;
      informado = datos;
      const cuerpo = new Blob([JSON.stringify(datos)], { type: "application/json" });
      // sendBeacon llega aunque la pestaña se esté cerrando.
      if (!navigator.sendBeacon?.(`${API}/lectura`, cuerpo)) {
        fetch(`${API}/lectura`, { method: "POST", body: cuerpo, keepalive: true }).catch(() => {});
      }
    };
    const informar = () => {
      acumular();
      if (id) enviar(id);
      // Si salió antes de que respondiera la visita (conexión lenta), se informa apenas llegue.
      else void registro.then((nuevo) => nuevo && enviar(nuevo));
    };
    const alCambiarVisibilidad = () => (document.visibilityState === "hidden" ? informar() : acumular());

    const ref = referente(primeraPagina);
    primeraPagina = false;
    const registro: Promise<string | null> = fetch(`${API}/visita`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta, referente: ref }),
      keepalive: true,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((r: { id: string | null } | null) => (id = r?.id ?? null))
      .catch(() => null);

    medirScroll();
    window.addEventListener("scroll", medirScroll, { passive: true });
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("pagehide", informar);
    return () => {
      // Cambió de página dentro del blog: se cierra esta visita.
      informar();
      window.removeEventListener("scroll", medirScroll);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("pagehide", informar);
    };
  }, [ruta]);

  return null;
}
