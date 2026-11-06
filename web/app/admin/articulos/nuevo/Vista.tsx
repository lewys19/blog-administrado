"use client";

import { useEffect, useState } from "react";

import { EditorArticulo } from "@/components/panel/EditorArticulo";
import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";

export function NuevoArticulo() {
  const yo = usePanel();
  // Next conserva las páginas ocultas al navegar: al salir se descarta el editor para volver a uno limpio.
  const [vez, setVez] = useState(0);
  useEffect(() => () => setVez((v) => v + 1), []);
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
      <EditorArticulo key={vez} inicial={null} />
    </div>
  );
}
