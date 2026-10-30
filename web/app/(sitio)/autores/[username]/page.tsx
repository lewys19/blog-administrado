import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Grilla } from "@/components/Tarjetas";
import { obtener } from "@/lib/servidor";
import type { Autor } from "@/lib/tipos";

type Props = PageProps<"/autores/[username]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await obtener<Autor>(`/blog/autores/${encodeURIComponent((await params).username)}`);
  return a
    ? { title: a.nombre, description: a.biografia ?? `Artículos de ${a.nombre}.` }
    : { title: "Autor no encontrado" };
}

export default async function PaginaAutor({ params }: Props) {
  const a = await obtener<Autor>(`/blog/autores/${encodeURIComponent((await params).username)}`);
  if (!a) notFound();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lateral text-2xl font-bold text-white">
          {a.nombre.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{a.nombre}</h1>
          <p className="text-texto-2">@{a.username}</p>
        </div>
      </div>
      {a.biografia && <p className="mt-4 max-w-2xl text-lg">{a.biografia}</p>}
      <h2 className="mt-10 mb-5 text-2xl font-bold tracking-tight">Artículos</h2>
      <Grilla articulos={a.articulos} vacio="Todavía no publicó artículos." />
    </div>
  );
}
