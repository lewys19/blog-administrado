"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Aviso, BotonAccion, Caja, GrupoAcciones, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import type { AnuncioAcademia } from "@/lib/tipos";

const ENTRADA = "w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-marca";

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

/** Publicidad de la columna derecha. Sin anuncios activos, ahí sale un curso propio destacado. */
export function Anuncios() {
  const [anuncios, setAnuncios] = useState<AnuncioAcademia[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [enlace, setEnlace] = useState("");
  const [activo, setActivo] = useState(true);
  const [imagen, setImagen] = useState<File | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    pedir<AnuncioAcademia[]>("/panel/academia/anuncios", { conSesion: true })
      .then(setAnuncios)
      .catch((e) => setError(mensaje(e, "No se pudieron cargar los anuncios.")));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function limpiar() {
    setEditando(null);
    setTitulo("");
    setEnlace("");
    setActivo(true);
    setImagen(null);
  }

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    setOk(null);
    setError(null);
    try {
      const guardado = await pedir<AnuncioAcademia>(
        editando ? `/panel/academia/anuncios/${editando}` : "/panel/academia/anuncios",
        { metodo: editando ? "PUT" : "POST", conSesion: true, cuerpo: { titulo, enlace, activo } },
      );
      if (imagen) {
        const cuerpo = new FormData();
        cuerpo.append("foto", imagen);
        try {
          await pedir(`/panel/academia/anuncios/${guardado.id}/imagen`, { metodo: "PUT", conSesion: true, cuerpo });
        } catch (err) {
          // El anuncio ya existe: queda en edición para no duplicarlo al reintentar.
          setEditando(guardado.id);
          setError(`Se guardó el anuncio, pero no la imagen: ${mensaje(err, "inténtalo otra vez.")}`);
          cargar();
          return;
        }
      }
      setOk(`Se guardó «${guardado.titulo}».`);
      limpiar();
      formulario.reset();
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo guardar."));
    }
  }

  async function eliminar(a: AnuncioAcademia) {
    setOk(null);
    setError(null);
    try {
      await pedir(`/panel/academia/anuncios/${a.id}`, { metodo: "DELETE", conSesion: true });
      setOk(`Se eliminó «${a.titulo}».`);
      cargar();
    } catch (err) {
      setError(mensaje(err, "No se pudo eliminar."));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-texto-2">
        Se muestran hasta 2 anuncios activos. Si no hay ninguno, la columna promociona tu curso de pago destacado más
        reciente.
      </p>
      <Aviso ok={ok} error={error} />
      <form onSubmit={guardar}>
        <Caja className="grid gap-3 p-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-texto-2">Título</span>
            <input
              id="anuncio-titulo"
              className={ENTRADA}
              required
              minLength={2}
              maxLength={80}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-texto-2">Enlace (https://…)</span>
            <input
              id="anuncio-enlace"
              className={ENTRADA}
              type="url"
              required
              maxLength={500}
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-texto-2">Imagen (se recorta a 600 × 500, opcional)</span>
            <input
              id="anuncio-imagen"
              className={ENTRADA}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex items-end justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 pb-2">
              <input
                id="anuncio-activo"
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              Activo
            </label>
            <button
              type="submit"
              className="rounded-lg bg-lateral px-4 py-2 font-semibold text-white hover:bg-lateral-activo"
            >
              {editando ? "Guardar anuncio" : "Agregar anuncio"}
            </button>
          </div>
        </Caja>
      </form>
      <Caja className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borde">
              <th className={TH}>Anuncio</th>
              <th className={TH}>Enlace</th>
              <th className={TH}>Estado</th>
              <th className={TH}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {anuncios.map((a) => (
              <tr key={a.id} className="border-b border-borde last:border-0">
                <td className={`${TD} font-medium`}>{a.titulo}</td>
                <td className={`${TD} max-w-56 truncate`}>{a.enlace}</td>
                <td className={TD}>{a.activo ? "Activo" : "Pausado"}</td>
                <td className={TD}>
                  <GrupoAcciones>
                    <BotonAccion
                      tipo="editar"
                      titulo={`Editar ${a.titulo}`}
                      onClick={() => {
                        setEditando(a.id);
                        setTitulo(a.titulo);
                        setEnlace(a.enlace);
                        setActivo(a.activo);
                      }}
                    />
                    <BotonAccion tipo="eliminar" titulo={`Eliminar ${a.titulo}`} onClick={() => eliminar(a)} />
                  </GrupoAcciones>
                </td>
              </tr>
            ))}
            {!anuncios.length && (
              <tr>
                <td colSpan={4} className={`${TD} text-center text-texto-2`}>
                  Sin anuncios: la columna muestra tu curso destacado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Caja>
    </div>
  );
}
