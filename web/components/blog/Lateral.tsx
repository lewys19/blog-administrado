// Piezas de la barra lateral y de las secciones del blog (como en el modelo TechBlog, en verde).
import Link from "next/link";
import type { ReactNode } from "react";

import { ICONOS, Icono } from "@/components/blog/Iconos";
import { cifra, pais } from "@/lib/formato";
import type { ArticuloTarjeta, AutorFicha, Cuenta, Etiqueta, MasLeido } from "@/lib/tipos";

export function Caja({
  titulo,
  children,
  className = "",
}: {
  titulo?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-borde bg-pagina p-5 shadow-sm ${className}`}>
      {titulo && <h2 className="mb-4 text-base font-bold">{titulo}</h2>}
      {children}
    </section>
  );
}

export function Avatar({ nombre, className = "h-10 w-10 text-base" }: { nombre: string; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-marca font-bold text-white ${className}`}
      aria-hidden="true"
    >
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
}

/** Miniatura cuadrada: la portada o un fondo verde con la inicial. */
export function Miniatura({
  imagen,
  titulo,
  className = "h-16 w-16",
}: {
  imagen: string | null;
  titulo: string;
  className?: string;
}) {
  return imagen ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imagen} alt="" loading="lazy" className={`${className} shrink-0 rounded-lg object-cover`} />
  ) : (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-lateral to-lateral-activo font-mono text-lg font-bold text-lateral-texto`}
      aria-hidden="true"
    >
      {titulo.charAt(0)}
    </span>
  );
}

export function SobreAutor({ autor }: { autor: AutorFicha }) {
  return (
    <Caja titulo="Sobre el autor">
      <div className="flex items-center gap-3">
        <Avatar nombre={autor.nombre} className="h-14 w-14 text-xl" />
        <div>
          <Link href={`/autores/${autor.username}`} className="font-bold hover:text-marca-fuerte">
            {autor.nombre}
          </Link>
          <p className="text-sm text-texto-2">
            {autor.articulos} {autor.articulos === 1 ? "artículo" : "artículos"}
          </p>
        </div>
      </div>
      {autor.biografia && <p className="mt-3 text-sm text-texto-2">{autor.biografia}</p>}
      <Link
        href={`/autores/${autor.username}`}
        className="mt-4 block rounded-lg border border-marca px-3 py-2 text-center text-sm font-semibold text-marca-fuerte hover:bg-marca-suave"
      >
        Ver sus artículos
      </Link>
    </Caja>
  );
}

export function Relacionados({ articulos }: { articulos: ArticuloTarjeta[] }) {
  if (!articulos.length) return null;
  return (
    <Caja titulo="Artículos relacionados">
      <ul className="space-y-4">
        {articulos.map((a) => (
          <li key={a.slug}>
            <Link href={`/blog/${a.slug}`} className="group flex gap-3">
              <Miniatura imagen={a.imagen} titulo={a.titulo} />
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm font-semibold group-hover:text-marca-fuerte">{a.titulo}</span>
                <span className="mt-1 flex items-center gap-1 text-xs text-texto-2">
                  <Icono d={ICONOS.reloj} className="h-3.5 w-3.5" /> {a.minutos_lectura} min
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Caja>
  );
}

export function MasLeidos({ articulos }: { articulos: MasLeido[] }) {
  if (!articulos.length) return null;
  return (
    <Caja titulo="Más leídos">
      <ol className="space-y-3">
        {articulos.map((a, i) => (
          <li key={a.slug}>
            <Link href={`/blog/${a.slug}`} className="group flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marca text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium group-hover:text-marca-fuerte">{a.titulo}</span>
              {a.vistas > 0 && (
                <span className="shrink-0 text-xs text-texto-2 tabular-nums">{cifra(a.vistas)} vistas</span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </Caja>
  );
}

export function TagsPopulares({ etiquetas, limite = 12 }: { etiquetas: Etiqueta[]; limite?: number }) {
  if (!etiquetas.length) return null;
  const populares = [...etiquetas].sort((a, b) => b.articulos - a.articulos).slice(0, limite);
  return (
    <Caja titulo="Etiquetas populares">
      <div className="flex flex-wrap gap-2">
        {populares.map((e) => (
          <Link
            key={e.slug}
            href={`/etiqueta/${e.slug}`}
            className="rounded-lg bg-marca-suave px-3 py-1.5 text-sm font-medium text-marca-fuerte hover:bg-marca hover:text-white"
          >
            {e.nombre}
          </Link>
        ))}
      </div>
    </Caja>
  );
}

/** Lugar reservado para un anuncio (se activa con el módulo de Publicidad). Mientras, el aviso propio de zcorp. */
export function Publicidad() {
  return (
    <aside
      aria-label="Publicidad"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-lateral via-lateral-activo to-marca-fuerte p-6 text-white shadow-sm"
    >
      <span className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-marca/30" aria-hidden="true" />
      <p className="relative text-2xl leading-tight font-bold">
        Tu proyecto web
        <br />
        desde <span className="text-[#7ff0b0]">S/300</span>
      </p>
      <ul className="relative mt-4 space-y-2 text-sm text-white/90">
        {["Páginas web", "Sistemas a medida", "Tienda virtual", "Hosting y dominio"].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-marca">
              <Icono d={ICONOS.check} className="h-3 w-3" />
            </span>
            {t}
          </li>
        ))}
      </ul>
      <Link
        href="/contacto"
        className="relative mt-5 inline-block rounded-lg bg-white px-5 py-2 text-sm font-bold text-marca-fuerte hover:bg-marca-suave"
      >
        Ver planes
      </Link>
    </aside>
  );
}

/** Lugar del boletín (se activa en el Sprint de Newsletter). */
export function Newsletter() {
  return (
    <Caja>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marca-suave text-marca-fuerte">
          <Icono d={ICONOS.correo} />
        </span>
        <div>
          <h2 className="font-bold">Newsletter</h2>
          <p className="text-sm text-texto-2">Recibe los mejores artículos, tutoriales y noticias en tu correo.</p>
        </div>
      </div>
      <form className="mt-4 space-y-2" aria-describedby="boletin-pronto">
        <label htmlFor="boletin-correo" className="sr-only">
          Tu correo electrónico
        </label>
        <input
          id="boletin-correo"
          type="email"
          disabled
          placeholder="Tu correo electrónico"
          className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled
          className="w-full rounded-lg bg-marca/70 px-3 py-2 text-sm font-semibold text-white"
        >
          Suscribirme
        </button>
        <p id="boletin-pronto" className="text-center text-xs text-texto-2">
          Muy pronto podrás suscribirte.
        </p>
      </form>
    </Caja>
  );
}

/** Bandera a partir del código del país (letras regionales de Unicode). */
function bandera(codigo: string): string {
  return String.fromCodePoint(...[...codigo.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** ¿De dónde nos visitan? Países de los últimos 30 días, en porcentaje. */
export function Paises({ cuentas }: { cuentas: Cuenta[] }) {
  const total = cuentas.reduce((s, c) => s + c.visitas, 0);
  return (
    <Caja titulo="¿De dónde nos visitan?">
      {total ? (
        <ul className="space-y-3">
          {cuentas.map((c) => {
            const parte = (c.visitas / total) * 100;
            return (
              <li key={c.clave ?? "otros"} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-lg leading-none" aria-hidden="true">
                    {c.clave ? bandera(c.clave) : <Icono d={ICONOS.mundo} className="h-5 w-5 text-texto-2" />}
                  </span>
                  <span className="flex-1">{c.clave ? pais(c.clave) : "Otros países"}</span>
                  <span className="font-semibold tabular-nums">{parte.toFixed(1)}%</span>
                </div>
                <div className="mt-1.5 ml-8 h-1.5 overflow-hidden rounded-full bg-marca-suave">
                  <div className="h-full rounded-full bg-marca" style={{ width: `${parte}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-sm text-texto-2">
          <Icono d={ICONOS.mundo} /> Aún no hay visitas este mes.
        </p>
      )}
      <p className="mt-4 text-xs text-texto-2">Últimos 30 días · sin cookies ni datos personales.</p>
    </Caja>
  );
}

/** Inicio › Categoría › Título */
export function Migas({ items }: { items: { texto: string; href?: string }[] }) {
  return (
    <nav aria-label="Ruta" className="text-sm text-texto-2">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-marca-fuerte">
            Inicio
          </Link>
        </li>
        {items.map((i) => (
          <li key={i.texto} className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true">›</span>
            {i.href ? (
              <Link href={i.href} className="hover:text-marca-fuerte">
                {i.texto}
              </Link>
            ) : (
              <span className="truncate text-texto" aria-current="page">
                {i.texto}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
