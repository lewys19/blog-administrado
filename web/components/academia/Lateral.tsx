// Columna derecha de los cursos: etiquetas por grupo y publicidad (o un curso propio si no hay anuncios).
import Link from "next/link";

import { Portada, Precio } from "@/components/academia/Cursos";
import { Caja } from "@/components/blog/Lateral";
import { rutaCurso } from "@/lib/academia";
import type { GrupoEtiqueta, LateralAcademia } from "@/lib/tipos";

// Cada etiqueta busca en su sección: las de manuales en /academia/manuales, etc.
const GRUPOS: { grupo: GrupoEtiqueta; titulo: string }[] = [
  { grupo: "cursos", titulo: "Etiquetas populares · Cursos" },
  { grupo: "manuales", titulo: "Etiquetas · Manuales" },
  { grupo: "sistemas", titulo: "Sistemas" },
];

export function LateralCursos({ datos }: { datos: LateralAcademia | null }) {
  if (!datos) return null;
  return (
    <aside className="space-y-6" aria-label="Barra lateral">
      {GRUPOS.map(({ grupo, titulo }) => {
        const etiquetas = datos.etiquetas.filter((e) => e.grupo === grupo);
        if (!etiquetas.length) return null;
        return (
          <Caja key={grupo} titulo={titulo}>
            <div className="flex flex-wrap gap-2">
              {etiquetas.map((e) => (
                <Link
                  key={e.id}
                  href={`/academia/${grupo}?q=${encodeURIComponent(e.nombre)}`}
                  className="rounded-lg bg-marca-suave px-3 py-1 text-sm font-medium text-marca-fuerte hover:bg-marca hover:text-white"
                >
                  {e.nombre}
                </Link>
              ))}
            </div>
          </Caja>
        );
      })}

      {datos.anuncios.map((a) => (
        <Caja key={a.id} titulo="Publicidad">
          <a
            href={a.enlace}
            target="_blank"
            rel="sponsored noreferrer"
            className="block font-semibold hover:text-marca-fuerte"
          >
            {a.imagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.imagen} alt="" width={600} height={500} className="mb-3 w-full rounded-xl" />
            )}
            {a.titulo}
          </a>
        </Caja>
      ))}

      {datos.curso && (
        <Caja titulo="Curso recomendado">
          <Link href={rutaCurso(datos.curso)} className="block font-semibold hover:text-marca-fuerte">
            <span className="mb-3 block overflow-hidden rounded-xl">
              <Portada curso={datos.curso} />
            </span>
            {datos.curso.titulo}
          </Link>
          <div className="mt-2">
            <Precio curso={datos.curso} />
          </div>
        </Caja>
      )}
    </aside>
  );
}
