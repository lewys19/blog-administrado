"use client";

import { useSyncExternalStore } from "react";

const nada = () => () => {};

/** "jue, 30 oct 2026" en la hora de Lima. Se dibuja en el navegador (la página se guarda en caché sin fecha). */
export function FechaHoy() {
  const texto = useSyncExternalStore(
    nada,
    () =>
      new Date().toLocaleDateString("es-PE", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "America/Lima",
      }),
    () => "",
  );
  return <span suppressHydrationWarning>{texto}</span>;
}
