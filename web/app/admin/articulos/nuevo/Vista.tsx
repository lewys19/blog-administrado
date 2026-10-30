"use client";

import { EditorArticulo } from "@/components/panel/EditorArticulo";
import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";

export function NuevoArticulo() {
  const yo = usePanel();
  if (!puede(yo, "articulos.escribir")) return <SinPermiso />;
  return (
    <div className="mx-auto max-w-7xl">
      <Migas items={[{ texto: "Artículos", href: "/admin/articulos" }, { texto: "Nuevo" }]} />
      <EditorArticulo inicial={null} />
    </div>
  );
}
