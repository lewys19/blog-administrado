import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { Portada, Precio } from "@/components/academia/Cursos";
import { ObtenerCurso } from "@/components/academia/ObtenerCurso";
import { ICONOS, Icono } from "@/components/blog/Iconos";
import { Migas } from "@/components/blog/Lateral";
import { NIVELES, rutaCurso, SECCIONES_ACADEMIA, seccionAcademia } from "@/lib/academia";
import { obtener } from "@/lib/servidor";
import { WHATSAPP_ACADEMIA } from "@/lib/sitio";
import type { CursoPublico } from "@/lib/tipos";

type Props = PageProps<"/academia/[seccion]/[slug]">;

function cargar(slug: string) {
  return obtener<CursoPublico>(`/academia/cursos/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await cargar((await params).slug);
  if (!c) return { title: "Curso no encontrado" };
  return {
    title: c.titulo,
    description: c.descripcion.slice(0, 160),
    alternates: { canonical: rutaCurso(c) },
  };
}

export default async function Curso({ params }: Props) {
  const { seccion: valor, slug } = await params;
  const c = await cargar(slug);
  const seccion = seccionAcademia(valor);
  if (!c || !seccion) notFound();
  // Un manual abierto con /academia/cursos/... se manda a su dirección correcta.
  if (SECCIONES_ACADEMIA[seccion].tipo !== c.tipo) permanentRedirect(rutaCurso(c));
  const { titulo, contenido } = SECCIONES_ACADEMIA[seccion];
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <article className="min-w-0">
        <Migas
          items={[
            { texto: "Academia Digital", href: "/academia" },
            { texto: titulo, href: `/academia/${seccion}` },
            { texto: c.titulo },
          ]}
        />
        <h1 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">{c.titulo}</h1>
        <p className="mt-4 text-lg whitespace-pre-line text-texto-2">{c.descripcion}</p>
        {!!c.tecnologias.length && (
          <section aria-labelledby="tecnologias-titulo" className="mt-8">
            <h2 id="tecnologias-titulo" className="mb-3 text-xl font-bold">
              Tecnologías
            </h2>
            <ul className="flex flex-wrap gap-2">
              {c.tecnologias.map((t) => (
                <li key={t} className="rounded-lg bg-marca-suave px-3 py-1 text-sm font-medium text-marca-fuerte">
                  {t}
                </li>
              ))}
            </ul>
          </section>
        )}
        {!!c.temario.length && (
          <section aria-labelledby="temario-titulo" className="mt-8">
            <h2 id="temario-titulo" className="mb-3 text-xl font-bold">
              {contenido}
            </h2>
            <ol className="space-y-2">
              {c.temario.map((tema, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-borde bg-pagina px-4 py-2.5">
                  <span className="font-bold text-marca-fuerte">{i + 1}.</span> {tema}
                </li>
              ))}
            </ol>
          </section>
        )}
        {c.instalacion && (
          <section aria-labelledby="instalacion-titulo" className="mt-8">
            <h2 id="instalacion-titulo" className="mb-3 text-xl font-bold">
              Cómo instalar
            </h2>
            <p className="rounded-lg border border-borde bg-pagina px-4 py-3 whitespace-pre-line">{c.instalacion}</p>
          </section>
        )}
      </article>
      <aside aria-label="Acceso">
        <div className="overflow-hidden rounded-2xl border border-borde bg-pagina shadow-sm lg:sticky lg:top-4">
          <Portada curso={c} />
          <div className="space-y-4 p-5">
            <Precio curso={c} grande />
            <ObtenerCurso curso={c} whatsapp={WHATSAPP_ACADEMIA} />
            <ul className="space-y-2 text-sm text-texto-2">
              {c.tipo !== "sistema" && (
                <li className="flex items-center gap-2">
                  <Icono d={ICONOS.check} className="h-4 w-4 text-marca" /> Nivel {NIVELES[c.nivel].toLowerCase()}
                </li>
              )}
              {c.horas !== null && (
                <li className="flex items-center gap-2">
                  <Icono d={ICONOS.reloj} className="h-4 w-4 text-marca" /> {c.horas} horas de video
                </li>
              )}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
