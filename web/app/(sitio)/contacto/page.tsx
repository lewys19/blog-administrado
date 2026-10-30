import type { Metadata } from "next";

import { Redes } from "@/components/Sitio";
import { Migas } from "@/components/blog/Lateral";
import { CORREO_CONTACTO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Contacto y publicidad",
  description: "Escríbenos para colaborar, patrocinar o anunciarte en zcorp-stack.",
};

export default function Contacto() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Migas items={[{ texto: "Contacto" }]} />
      <h1 className="mt-5 text-4xl font-bold tracking-tight">Contacto y publicidad</h1>
      <p className="mt-4 text-lg text-texto-2">
        ¿Quieres colaborar, patrocinar un artículo o anunciarte frente a una audiencia de tecnología? Escríbenos.
      </p>
      <div className="mt-8 rounded-2xl border border-borde bg-pagina p-6 shadow-sm">
        {CORREO_CONTACTO ? (
          <p>
            Correo:{" "}
            <a href={`mailto:${CORREO_CONTACTO}`} className="font-semibold text-marca-fuerte hover:underline">
              {CORREO_CONTACTO}
            </a>
          </p>
        ) : (
          <p className="text-texto-2">Muy pronto tendremos aquí un formulario de contacto.</p>
        )}
        <Redes className="mt-4" />
      </div>
    </div>
  );
}
