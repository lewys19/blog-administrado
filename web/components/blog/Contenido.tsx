"use client";

import type { MouseEvent } from "react";

import { conBotonCopiar } from "@/lib/codigo";

// navigator.clipboard solo existe en https o localhost; en http se copia a la antigua.
async function copiar(texto: string) {
  if (navigator.clipboard) return navigator.clipboard.writeText(texto);
  const area = document.createElement("textarea");
  area.value = texto;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("No se pudo copiar");
}

/** El cuerpo del artículo. HTML generado y limpiado en el servidor (services/markdown.py). */
export function Contenido({ html }: { html: string }) {
  function alHacerClic(e: MouseEvent<HTMLDivElement>) {
    const boton = (e.target as HTMLElement).closest<HTMLButtonElement>(".copiar-codigo");
    const codigo = boton?.parentElement?.querySelector("pre")?.textContent;
    if (!boton || codigo == null) return;
    copiar(codigo.trimEnd())
      .then(() => (boton.textContent = "¡Copiado!"))
      .catch(() => (boton.textContent = "No se pudo"))
      .finally(() => setTimeout(() => (boton.textContent = "Copiar"), 2000));
  }

  return (
    <div className="contenido mt-8" onClick={alHacerClic} dangerouslySetInnerHTML={{ __html: conBotonCopiar(html) }} />
  );
}
