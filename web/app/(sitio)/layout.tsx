import { Suspense } from "react";

import { Contador } from "@/components/Contador";
import { Encabezado, EncabezadoCargando, Pie } from "@/components/Sitio";

// El blog público: fondo blanco con detalles verdes. El panel (/admin) no lleva este encabezado.
export default function LayoutSitio({ children }: LayoutProps<"/">) {
  return (
    <div className="sitio-claro flex flex-1 flex-col">
      <Suspense fallback={<EncabezadoCargando />}>
        <Encabezado />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
      <Pie />
      {/* La ruta llega al navegador después del primer dibujo: el contador no frena la página. */}
      <Suspense fallback={null}>
        <Contador />
      </Suspense>
    </div>
  );
}
