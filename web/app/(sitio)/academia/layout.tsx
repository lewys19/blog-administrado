import { Suspense } from "react";

import { EnlaceMenu } from "@/components/blog/EnlaceMenu";
import { SECCIONES_ACADEMIA } from "@/lib/academia";

// Barra propia de la Academia, debajo del menú del blog.
export default function LayoutAcademia({ children }: LayoutProps<"/academia">) {
  return (
    <>
      <nav aria-label="Academia Digital" className="border-b border-borde bg-pagina">
        <ul className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 py-2">
          <Suspense>
            {Object.entries(SECCIONES_ACADEMIA).map(([seccion, { titulo }]) => (
              <li key={seccion}>
                <EnlaceMenu href={`/academia/${seccion}`}>{titulo}</EnlaceMenu>
              </li>
            ))}
            <li>
              <EnlaceMenu href="/academia/promociones">Promociones</EnlaceMenu>
            </li>
          </Suspense>
        </ul>
      </nav>
      {children}
    </>
  );
}
