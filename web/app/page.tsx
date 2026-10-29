import { Isotipo } from "@/components/Logo";

const CATEGORIAS = ["Programación", "Python", "FastAPI", "SQL", "QA", "IA"];

/** Portada provisional: el blog llega en el Sprint 1. */
export default function Portada() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-xl text-center">
        <Isotipo className="mx-auto h-14 w-14" />
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance">zcorp-stack</h1>
        <p className="mt-3 text-lg text-texto-2">
          Tecnología, inteligencia artificial y programación, explicadas con proyectos reales.
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Temas">
          {CATEGORIAS.map((c) => (
            <li key={c} className="rounded-full border border-borde bg-superficie px-3 py-1 text-sm">
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-8 font-mono text-xs tracking-widest text-texto-2 uppercase">Muy pronto</p>
      </div>
    </main>
  );
}
