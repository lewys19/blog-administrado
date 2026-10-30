// Comentarios del artículo: los aprobados y el formulario para dejar uno.
import { FormComentario } from "@/components/blog/FormComentario";
import { ICONOS, Icono } from "@/components/blog/Iconos";
import { Avatar, Caja } from "@/components/blog/Lateral";
import { fechaLarga } from "@/lib/formato";
import type { ComentarioPublico } from "@/lib/tipos";

export function Comentarios({ slug, comentarios }: { slug: string; comentarios: ComentarioPublico[] }) {
  return (
    <Caja className="mt-8">
      <h2 id="comentarios" className="flex scroll-mt-24 items-center gap-2 text-lg font-bold">
        <Icono d={ICONOS.comentario} className="h-5 w-5 text-marca-fuerte" />
        Comentarios
        {!!comentarios.length && (
          <span className="rounded-full bg-marca-suave px-2 py-0.5 text-sm text-marca-fuerte">
            {comentarios.length}
          </span>
        )}
      </h2>

      {comentarios.length ? (
        <ol className="mt-5 space-y-5">
          {comentarios.map((c) => (
            <li key={c.id} id={`comentario-${c.id}`} className="flex gap-3">
              <Avatar nombre={c.nombre} />
              <div className="min-w-0 flex-1 rounded-xl bg-fondo px-4 py-3">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-bold">{c.nombre}</span>
                  <time dateTime={c.creado_en} className="text-xs text-texto-2">
                    {fechaLarga(c.creado_en)}
                  </time>
                </p>
                {/* Texto plano: se muestra tal cual, respetando los saltos de línea. */}
                <p className="mt-1 text-sm break-words whitespace-pre-line">{c.contenido}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-texto-2">Todavía no hay comentarios. ¡Sé el primero en opinar!</p>
      )}

      <FormComentario slug={slug} />
    </Caja>
  );
}
