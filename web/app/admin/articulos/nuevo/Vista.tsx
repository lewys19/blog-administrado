"use client";

import { EditorArticulo } from "@/components/panel/EditorArticulo";
import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";

export function NuevoArticulo() {
  const yo = usePanel();
  if (!puede(yo, "articulos.escribir|guias.escribir")) return <SinPermiso />;
  const soloGuias = !puede(yo, "articulos.escribir");
  return (
    <div className="mx-auto max-w-7xl">
      <Migas
        items={[
          {
            texto: soloGuias ? "Mis guías" : "Artículos",
            href: "/admin/articulos",
          },
          { texto: "Nuevo" },
        ]}
      />
      <EditorArticulo inicial={null} />
    </div>
  );
}
