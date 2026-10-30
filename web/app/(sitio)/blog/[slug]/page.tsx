import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Grilla, Meta } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import { NOMBRE_SITIO, SITIO_URL } from "@/lib/sitio";
import type { ArticuloPublico } from "@/lib/tipos";

type Props = PageProps<"/blog/[slug]">;

async function cargar(slug: string) {
  return obtener<ArticuloPublico>(`/blog/articulos/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await cargar((await params).slug);
  if (!a) return { title: "Artículo no encontrado" };
  const url = `${SITIO_URL}/blog/${a.slug}`;
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

export default async function PaginaArticulo({ params }: Props) {
  const a = await cargar((await params).slug);
  if (!a) notFound();

  // Datos estructurados (Schema.org): Google entiende que es un artículo, de quién y de cuándo.
  const datos = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.titulo,
    description: a.meta_descripcion,
    datePublished: a.publicado_en,
    dateModified: a.actualizado_en,
    author: { "@type": "Person", name: a.autor.nombre, url: `${SITIO_URL}/autores/${a.autor.username}` },
    publisher: { "@type": "Organization", name: NOMBRE_SITIO, url: SITIO_URL },
    mainEntityOfPage: `${SITIO_URL}/blog/${a.slug}`,
    image: a.imagen ? `${SITIO_URL}${a.imagen}` : undefined,
    keywords: a.etiquetas.map((e) => e.nombre).join(", ") || undefined,
    articleSection: a.categoria?.nombre,
  };

  return (
    <article className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
      />
      <header className="mx-auto max-w-3xl px-4 pt-10">
        {a.categoria && (
          <Link
            href={`/categoria/${a.categoria.slug}`}
            className="font-mono text-xs font-semibold tracking-widest text-marca-fuerte uppercase"
          >
            {a.categoria.nombre}
          </Link>
        )}
        <h1 className="mt-2 text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">{a.titulo}</h1>
        {a.resumen && <p className="mt-4 text-xl text-texto-2">{a.resumen}</p>}
        <div className="mt-5">
          <Meta a={a} />
        </div>
      </header>
      {a.imagen && (
        <div className="mx-auto mt-8 max-w-4xl px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.imagen} alt="" width={1200} height={630} className="w-full rounded-2xl border border-borde" />
        </div>
      )}
      {/* HTML generado y limpiado en el servidor (services/markdown.py): sin scripts ni atributos peligrosos. */}
      <div className="contenido mx-auto mt-10 max-w-3xl px-4" dangerouslySetInnerHTML={{ __html: a.contenido_html }} />
      <footer className="mx-auto mt-12 max-w-3xl space-y-8 px-4">
        {!!a.etiquetas.length && (
          <div className="flex flex-wrap gap-2">
            {a.etiquetas.map((e) => (
              <Link
                key={e.slug}
                href={`/etiqueta/${e.slug}`}
                className="rounded-full border border-borde bg-superficie px-3 py-1 text-sm hover:border-marca"
              >
                #{e.nombre}
              </Link>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 rounded-2xl border border-borde bg-superficie p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lateral text-xl font-bold text-white">
            {a.autor.nombre.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm text-texto-2">Escrito por</p>
            <Link href={`/autores/${a.autor.username}`} className="font-semibold hover:underline">
              {a.autor.nombre}
            </Link>
          </div>
        </div>
      </footer>
      {!!a.relacionados.length && (
        <section className="mx-auto mt-14 max-w-6xl px-4">
          <h2 className="mb-5 text-2xl font-bold tracking-tight">Sigue leyendo</h2>
          <Grilla articulos={a.relacionados} vacio="" />
        </section>
      )}
    </article>
  );
}
