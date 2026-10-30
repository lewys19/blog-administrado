import type { Metadata } from "next";
import Link from "next/link";

import { Migas } from "@/components/blog/Lateral";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description: "zcorp-stack: guías prácticas de tecnología, inteligencia artificial y programación en español.",
};

export default function SobreNosotros() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Migas items={[{ texto: "Sobre nosotros" }]} />
      <h1 className="mt-5 text-4xl font-bold tracking-tight">Sobre nosotros</h1>
      <div className="contenido mt-6">
        <p>
          <strong>zcorp-stack</strong> es un blog de tecnología, inteligencia artificial y programación escrito en
          español. Publicamos guías prácticas con proyectos reales: Python, FastAPI, bases de datos, pruebas de software
          e IA aplicada al trabajo diario.
        </p>
        <p>
          Cada artículo nace de algo que construimos y probamos: el código que ves funciona, y te contamos también los
          errores que encontramos en el camino.
        </p>
      </div>
      <Link
        href="/categorias"
        className="mt-8 inline-block rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white hover:bg-marca-fuerte"
      >
        Explorar categorías
      </Link>
    </div>
  );
}
