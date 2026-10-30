"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Enlace del menú: la sección donde estás queda en verde (como «Inicio» en el modelo). */
export function EnlaceMenu({ href, children }: { href: string; children: ReactNode }) {
  const ruta = usePathname();
  const activo = href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition ${
        activo ? "bg-marca text-white shadow-sm" : "hover:bg-marca-suave hover:text-marca-fuerte"
      }`}
    >
      {children}
    </Link>
  );
}
