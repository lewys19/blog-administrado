"use client";

import { useState } from "react";

import { ICONOS, Icono } from "@/components/blog/Iconos";

const boton =
  "flex h-8 w-8 items-center justify-center rounded-full bg-marca-suave text-marca-fuerte hover:bg-marca hover:text-white";

/** Compartir en redes (enlaces normales, sin scripts de terceros) y copiar el enlace. */
export function Compartir({ url, titulo }: { url: string; titulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titulo);
  const redes = [
    {
      nombre: "Facebook",
      icono: ICONOS.facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    {
      nombre: "X",
      icono: ICONOS.x,
      href: `https://x.com/intent/post?url=${u}&text=${t}`,
    },
    {
      nombre: "LinkedIn",
      icono: ICONOS.linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    },
    {
      nombre: "WhatsApp",
      icono: ICONOS.whatsapp,
      href: `https://wa.me/?text=${t}%20${u}`,
    },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {redes.map((r) => (
        <a
          key={r.nombre}
          href={r.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Compartir en ${r.nombre}`}
          className={boton}
        >
          <Icono d={r.icono} className="h-4 w-4" />
        </a>
      ))}
      <button
        type="button"
        aria-label="Copiar enlace"
        title={copiado ? "¡Copiado!" : "Copiar enlace"}
        className={boton}
        onClick={() => {
          navigator.clipboard
            ?.writeText(url)
            .then(() => {
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            })
            .catch(() => {});
        }}
      >
        <Icono d={ICONOS.enlace} className="h-4 w-4" />
      </button>
      <span role="status" className="text-xs text-marca-fuerte">
        {copiado ? "¡Enlace copiado!" : ""}
      </span>
    </div>
  );
}
