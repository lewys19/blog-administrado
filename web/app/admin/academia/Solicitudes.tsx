"use client";

import { useCallback, useEffect, useState } from "react";

import { Aviso, Caja, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, pedir } from "@/lib/api";
import { fecha } from "@/lib/formato";

const ACCION = "rounded-lg border border-borde px-3 py-1 text-sm font-medium hover:border-marca";

type Estado = "pendiente" | "aprobada" | "rechazada";

interface Solicitud {
  id: number;
  curso_titulo: string;
  codigo: string;
  nombre: string;
  whatsapp: string;
  estado: Estado;
  creado_en: string;
  entregado_en: string | null;
}

interface Datos {
  solicitudes: Solicitud[];
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  entregadas: number;
}

const FILTROS: { valor: Estado | ""; texto: string }[] = [
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "aprobada", texto: "Aprobadas" },
  { valor: "rechazada", texto: "Rechazadas" },
  { valor: "", texto: "Todas" },
];

/** Códigos de compra: se aprueban al confirmar el pago, y aquí se ve cuántos cursos se entregaron. */
export function Solicitudes() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [filtro, setFiltro] = useState<Estado | "">("pendiente");
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    pedir<Datos>(`/panel/academia/solicitudes${filtro ? `?estado=${filtro}` : ""}`, { conSesion: true })
      .then(setDatos)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : "No se pudieron cargar las solicitudes."));
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function revisar(s: Solicitud, estado: Estado) {
    setOk(null);
    setError(null);
    try {
      await pedir(`/panel/academia/solicitudes/${s.id}`, { metodo: "PUT", conSesion: true, cuerpo: { estado } });
      setOk(estado === "aprobada" ? `Aprobado: ${s.codigo} ya abre «${s.curso_titulo}».` : `Rechazado: ${s.codigo}.`);
      cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar.");
    }
  }

  const resumen = [
    ["Pendientes", datos?.pendientes],
    ["Aprobadas", datos?.aprobadas],
    ["Entregadas", datos?.entregadas],
    ["Rechazadas", datos?.rechazadas],
  ] as const;

  return (
    <div className="space-y-4">
      <Aviso ok={ok} error={error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {resumen.map(([texto, n]) => (
          <Caja key={texto} className="p-4">
            <p className="text-sm text-texto-2">{texto}</p>
            <p className="text-2xl font-bold">{n ?? "…"}</p>
          </Caja>
        ))}
      </div>
      <p className="text-sm text-texto-2">«Entregadas» son las que ya usaron su código para abrir el material.</p>
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.texto}
            type="button"
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`rounded-full border px-3 py-1 text-sm ${filtro === f.valor ? "border-marca font-semibold" : "border-borde"}`}
          >
            {f.texto}
          </button>
        ))}
      </div>
      <Caja className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={TH}>Código</th>
              <th className={TH}>Curso</th>
              <th className={TH}>Comprador</th>
              <th className={TH}>Fecha</th>
              <th className={TH}>Estado</th>
              <th className={TH}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datos?.solicitudes.map((s) => (
              <tr key={s.id}>
                <td className={`${TD} font-mono`}>{s.codigo}</td>
                <td className={TD}>{s.curso_titulo}</td>
                <td className={TD}>
                  {s.nombre}
                  <br />
                  <a
                    href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-marca-fuerte hover:underline"
                  >
                    {s.whatsapp}
                  </a>
                </td>
                <td className={TD}>{fecha(s.creado_en)}</td>
                <td className={TD}>{s.entregado_en ? "entregada" : s.estado}</td>
                <td className={TD}>
                  <div className="flex gap-2">
                    {s.estado !== "aprobada" && (
                      <button type="button" className={ACCION} onClick={() => revisar(s, "aprobada")}>
                        Aprobar
                      </button>
                    )}
                    {s.estado !== "rechazada" && (
                      <button type="button" className={ACCION} onClick={() => revisar(s, "rechazada")}>
                        Rechazar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {datos && !datos.solicitudes.length && <p className="p-6 text-center text-texto-2">No hay solicitudes aquí.</p>}
      </Caja>
    </div>
  );
}
