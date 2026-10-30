import { Suspense } from "react";

import { Contador } from "@/components/Contador";
import { Encabezado, Pie } from "@/components/Sitio";

// El blog público. El panel (/admin) no lleva este encabezado.
export default function LayoutSitio({ children }: LayoutProps<"/">) {
  return (
    <>
      <Encabezado />
      <main className="flex flex-1 flex-col">{children}</main>
      <Pie />
      {/* La ruta llega al navegador después del primer dibujo: el contador no frena la página. */}
      <Suspense fallback={null}>
        <Contador />
      </Suspense>
    </>
  );
}
