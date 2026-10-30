"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { EditorArticulo } from "@/components/panel/EditorArticulo";
import { Migas } from "@/components/panel/Panel";
import { Aviso } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import type { ArticuloEditor } from "@/lib/tipos";

export function EditarArticulo() {
  const { id } = useParams<{ id: string }>();
  const [a, setA] = useState<ArticuloEditor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pedir<ArticuloEditor>(`/panel/articulos/${id}`, { conSesion: true })
      .then(setA)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : "No se pudo cargar el artículo."));
  }, [id]);

  return (
    <div className="mx-auto max-w-7xl">
      <Migas items={[{ texto: "Artículos", href: "/admin/articulos" }, { texto: a?.titulo ?? "…" }]} />
      {error ? (
        <Aviso error={error} />
      ) : a ? (
        <EditorArticulo key={a.id} inicial={a} />
      ) : (
        <p className="text-texto-2">Cargando…</p>
      )}
    </div>
  );
}
