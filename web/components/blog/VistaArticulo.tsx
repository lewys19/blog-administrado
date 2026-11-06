import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { Comentarios } from "@/components/blog/Comentarios";
import { Compartir } from "@/components/blog/Compartir";
import { Contenido } from "@/components/blog/Contenido";
import { ICONOS, Icono } from "@/components/blog/Iconos";
import { Avatar, Migas, Newsletter, Publicidad, Relacionados, SobreAutor } from "@/components/blog/Lateral";
import { cifra, fechaLarga } from "@/lib/formato";
import { indice } from "@/lib/indice";
import { obtener } from "@/lib/servidor";
import { NOMBRE_SITIO, SITIO_URL } from "@/lib/sitio";
import { rutaArticulo } from "@/lib/rutas";
import type { ArticuloPublico, ComentarioPublico, TipoArticulo } from "@/lib/tipos";

// La página de una noticia (/blog/<slug>) o de una guía (/guias/<slug>): las dos rutas usan esta vista.

async function cargar(slug: string) {
  return obtener<ArticuloPublico>(`/blog/articulos/${encodeURIComponent(slug)}`);
}

export async function metadatosArticulo(slug: string): Promise<Metadata> {
  const a = await cargar(slug);
  if (!a) return { title: "Artículo no encontrado" };
  const url = `${SITIO_URL}${rutaArticulo(a)}`;
  return {
    title: a.meta_titulo,
    description: a.meta_descripcion,
    keywords: a.palabras_clave ?? undefined,
    alternates: { canonical: url },
    authors: [{ name: a.autor.nombre, url: `${SITIO_URL}/autores/${a.autor.username}` }],
    openGraph: {
      type: "article",
      url,
      siteName: NOMBRE_SITIO,
      title: a.meta_titulo,
      description: a.meta_descripcion,
      publishedTime: a.publicado_en,
      modifiedTime: a.actualizado_en,
      authors: [a.autor.nombre],
      tags: a.etiquetas.map((e) => e.nombre),
      images: a.imagen ? [{ url: `${SITIO_URL}${a.imagen}`, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: a.imagen ? "summary_large_image" : "summary",
      title: a.meta_titulo,
      description: a.meta_descripcion,
    },
  };
}

export async function VistaArticulo({ slug, tipo, tema }: { slug: string; tipo: TipoArticulo; tema?: string }) {
  const [a, comentarios] = await Promise.all([
    cargar(slug),
    obtener<ComentarioPublico[]>(`/blog/articulos/${encodeURIComponent(slug)}/comentarios`),
  ]);
  if (!a) notFound();
  // Una guía abierta con /blog/... (o con otro tema, o al revés) se manda a su dirección correcta.
  if (a.tipo !== tipo || (tema && a.tema?.slug !== tema)) permanentRedirect(rutaArticulo(a));

  // Datos estructurados (Schema.org): Google entiende que es un artículo, de quién y de cuándo.
  const datos = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.titulo,
    description: a.meta_descripcion,
    datePublished: a.publicado_en,
    dateModified: a.actualizado_en,
    author: {
      "@type": "Person",
      name: a.autor.nombre,
      url: `${SITIO_URL}/autores/${a.autor.username}`,
    },
    publisher: { "@type": "Organization", name: NOMBRE_SITIO, url: SITIO_URL },
    mainEntityOfPage: `${SITIO_URL}${rutaArticulo(a)}`,
    image: a.imagen ? `${SITIO_URL}${a.imagen}` : undefined,
    keywords: a.etiquetas.map((e) => e.nombre).join(", ") || undefined,
    articleSection: a.categoria?.nombre,
  };

  const url = `${SITIO_URL}${rutaArticulo(a)}`;
  const entradas = indice(a.contenido_html);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(datos).replace(/</g, "\\u003c"),
        }}
      />
      <article className="min-w-0">
        <Migas
          items={[
            ...(a.categoria
              ? [
                  {
                    texto: a.categoria.nombre,
                    href: `/categoria/${a.categoria.slug}`,
                  },
                ]
              : []),
            { texto: a.titulo },
          ]}
        />
        <h1 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">{a.titulo}</h1>
        {a.resumen && <p className="mt-3 text-lg text-texto-2">{a.resumen}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-borde py-3 text-sm text-texto-2">
          <Link
            href={`/autores/${a.autor.username}`}
            className="flex items-center gap-2 font-semibold text-texto hover:text-marca-fuerte"
          >
            <Avatar nombre={a.autor.nombre} className="h-8 w-8 text-sm" />
            {a.autor.nombre}
          </Link>
          <span className="flex items-center gap-1.5">
            <Icono d={ICONOS.calendario} className="h-4 w-4" />
            <time dateTime={a.publicado_en}>{fechaLarga(a.publicado_en)}</time>
          </span>
          <span className="flex items-center gap-1.5">
            <Icono d={ICONOS.reloj} className="h-4 w-4" /> {a.minutos_lectura} min
          </span>
          <span className="flex items-center gap-1.5">
            <Icono d={ICONOS.ojo} className="h-4 w-4" /> {cifra(a.vistas)} {a.vistas === 1 ? "vista" : "vistas"}
          </span>
          <a href="#comentarios" className="flex items-center gap-1.5 hover:text-marca-fuerte">
            <Icono d={ICONOS.comentario} className="h-4 w-4" /> {a.comentarios}{" "}
            {a.comentarios === 1 ? "comentario" : "comentarios"}
          </a>
          <div className="sm:ml-auto">
            <Compartir url={url} titulo={a.titulo} />
          </div>
        </div>

        {a.imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.imagen}
            alt=""
            width={1200}
            height={630}
            className="mt-6 w-full rounded-2xl border border-borde"
          />
        )}

        {entradas.length >= 2 && (
          <nav aria-labelledby="indice-titulo" className="mt-6 rounded-2xl border border-borde bg-pagina p-5 shadow-sm">
            <h2 id="indice-titulo" className="mb-3 font-bold">
              Tabla de contenidos
            </h2>
            <ol className="space-y-1.5 text-sm">
              {entradas.map((e) => (
                <li key={e.id} className={e.nivel === 3 ? "pl-5" : ""}>
                  <a href={`#${e.id}`} className="text-texto-2 hover:text-marca-fuerte">
                    {e.texto}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <Contenido html={a.contenido_html} />
        {a.fuente_url && (
          <p className="mt-8 rounded-lg border border-borde bg-pagina px-4 py-3 text-sm text-texto-2">
            Fuente:{" "}
            <a
              href={a.fuente_url}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="font-medium text-marca-fuerte hover:underline"
            >
              {a.fuente_nombre || a.fuente_url}
            </a>
          </p>
        )}

        {!!a.etiquetas.length && (
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Etiquetas:</span>
            {a.etiquetas.map((e) => (
              <Link
                key={e.slug}
                href={`/etiqueta/${e.slug}`}
                className="rounded-lg bg-marca-suave px-3 py-1 text-sm font-medium text-marca-fuerte hover:bg-marca hover:text-white"
              >
                {e.nombre}
              </Link>
            ))}
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-marca-suave/60 p-4 text-sm">
          <span className="font-semibold">¿Te sirvió? Compártelo:</span>
          <Compartir url={url} titulo={a.titulo} />
        </div>

        <Comentarios slug={a.slug} comentarios={comentarios ?? []} />
      </article>

      <aside className="space-y-6" aria-label="Barra lateral">
        <SobreAutor autor={a.sobre_autor} />
        <Relacionados articulos={a.relacionados} />
        <Publicidad />
        <Newsletter />
      </aside>
    </div>
  );
}
