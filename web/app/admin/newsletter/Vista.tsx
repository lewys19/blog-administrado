"use client";

import { useCallback, useEffect, useState } from "react";

import { Migas, SinPermiso, puede, usePanel } from "@/components/panel/Panel";
import { Aviso, BotonAccion, Caja, GrupoAcciones, Paginacion, TD, TH } from "@/components/panel/Tabla";
import { ErrorApi, descargar, pedir } from "@/lib/api";
import { cifra, fecha, hace } from "@/lib/formato";
import type { ArticuloParaEnviar, Envio, EstadoSuscriptor, PaginaSuscriptores, Suscriptor } from "@/lib/tipos";

const POR_PAGINA = 20;
const PESTANAS: { estado: EstadoSuscriptor; texto: string; vacio: string; columna: string }[] = [
  {
    estado: "confirmado",
    texto: "Confirmados",
    vacio: "Todavía no hay suscriptores confirmados.",
    columna: "Confirmó",
  },
  { estado: "pendiente", texto: "Sin confirmar", vacio: "Nadie está esperando confirmar.", columna: "Se anotó" },
  { estado: "baja", texto: "Bajas", vacio: "Nadie se dio de baja.", columna: "Se dio de baja" },
];

function mensaje(e: unknown, otro: string): string {
  return e instanceof ErrorApi ? e.message : otro;
}

function fechaDe(s: Suscriptor): string {
  const valor = s.estado === "confirmado" ? s.confirmado_en : s.estado === "baja" ? s.baja_en : s.creado_en;
  return valor ?? s.creado_en;
}

function Cifra({
  titulo,
  valor,
  detalle,
  oscura = false,
}: {
  titulo: string;
  valor?: number;
  detalle: string;
  oscura?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 ${oscura ? "bg-lateral text-white" : "border border-borde bg-superficie"}`}>
      <p className={`text-sm ${oscura ? "text-lateral-texto" : "text-texto-2"}`}>{titulo}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{valor === undefined ? "—" : cifra(valor)}</p>
      <p className={`mt-1 text-xs ${oscura ? "text-marca" : "text-texto-2"}`}>{detalle}</p>
    </div>
  );
}

export function Newsletter() {
  const yo = usePanel();
  const permitido = puede(yo, "newsletter.gestionar");
  const [estado, setEstado] = useState<EstadoSuscriptor>("confirmado");
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaSuscriptores | null>(null);
  const [articulos, setArticulos] = useState<ArticuloParaEnviar[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [elegido, setElegido] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<Suscriptor | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const espera = setTimeout(() => {
      setQ(texto.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(espera);
  }, [texto]);

  const cargarSuscriptores = useCallback(() => {
    const params = new URLSearchParams({ estado, pagina: String(pagina), por_pagina: String(POR_PAGINA) });
    if (q) params.set("q", q);
    pedir<PaginaSuscriptores>(`/panel/newsletter/suscriptores?${params}`, { conSesion: true })
      .then(setDatos)
      .catch((e) => setError(mensaje(e, "No se pudo cargar la lista.")));
  }, [estado, q, pagina]);

  const cargarEnvios = useCallback(() => {
    pedir<Envio[]>("/panel/newsletter/envios", { conSesion: true })
      .then(setEnvios)
      .catch(() => {});
    pedir<ArticuloParaEnviar[]>("/panel/newsletter/articulos", { conSesion: true })
      .then((lista) => {
        setArticulos(lista);
        setElegido((actual) => actual || String(lista[0]?.id ?? ""));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (permitido) cargarSuscriptores();
  }, [permitido, cargarSuscriptores]);
  useEffect(() => {
    if (permitido) cargarEnvios();
  }, [permitido, cargarEnvios]);

  // Mientras un envío está en curso, el avance se consulta cada 3 segundos.
  const enCurso = envios.some((e) => e.estado === "enviando");
  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(cargarEnvios, 3000);
    return () => clearInterval(t);
  }, [enCurso, cargarEnvios]);

  if (!permitido) return <SinPermiso />;

  async function hacer(accion: () => Promise<string>, despues?: () => void) {
    setOk(null);
    setError(null);
    setOcupado(true);
    try {
      setOk(await accion());
      despues?.();
    } catch (e) {
      setError(mensaje(e, "No se pudo completar."));
    } finally {
      setOcupado(false);
    }
  }

  const articulo = articulos.find((a) => String(a.id) === elegido);
  const confirmados = datos?.conteo.confirmado ?? 0;

  const probar = () =>
    hacer(async () => {
      const r = await pedir<{ mensaje: string }>("/panel/newsletter/prueba", {
        metodo: "POST",
        conSesion: true,
        cuerpo: { articulo_id: Number(elegido) },
      });
      return r.mensaje;
    });

  const enviar = () => {
    setConfirmando(false);
    hacer(async () => {
      const e = await pedir<Envio>("/panel/newsletter/envios", {
        metodo: "POST",
        conSesion: true,
        cuerpo: { articulo_id: Number(elegido) },
      });
      return `Enviando «${e.asunto}» a ${cifra(e.total)} suscriptores…`;
    }, cargarEnvios);
  };

  const cambiarPestana = (e: EstadoSuscriptor) => {
    setEstado(e);
    setPagina(1);
    setDatos(null);
    setPorEliminar(null);
  };
  const pestana = PESTANAS.find((p) => p.estado === estado)!;

  return (
    <div className="mx-auto max-w-6xl">
      <Migas items={[{ texto: "Newsletter" }]} />
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Newsletter</h1>
      <p className="mb-5 text-sm text-texto-2">
        Quien se suscribe recibe un correo para confirmar; solo los confirmados reciben el boletín, y cada correo trae
        su enlace para darse de baja.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra titulo="Suscriptores" valor={datos?.conteo.confirmado} detalle="Confirmados" oscura />
        <Cifra titulo="Nuevos" valor={datos?.conteo.nuevos_30d} detalle="Confirmaron en 30 días" />
        <Cifra titulo="Sin confirmar" valor={datos?.conteo.pendiente} detalle="No abrieron el correo" />
        <Cifra titulo="Bajas" valor={datos?.conteo.baja} detalle="Ya no reciben el boletín" />
      </div>

      <div className="mt-5 space-y-2">
        <Aviso ok={ok} error={error} />
      </div>

      <section className="mt-5 rounded-2xl border border-borde bg-superficie p-5">
        <h2 className="font-bold">Enviar un artículo</h2>
        <p className="mb-4 text-sm text-texto-2">
          Mándate una prueba para ver cómo llega y luego envíalo a todos los confirmados.
        </p>
        {articulos.length ? (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Artículo</span>
              <select
                value={elegido}
                onChange={(e) => (setElegido(e.target.value), setConfirmando(false))}
                className="w-full rounded-lg border border-borde bg-superficie px-3 py-2"
              >
                {articulos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.titulo}
                    {a.enviado_en ? ` (ya enviado el ${fecha(a.enviado_en)})` : ""}
                  </option>
                ))}
              </select>
            </label>
            {articulo?.enviado_en && (
              <p className="rounded-lg bg-aviso/10 px-3 py-2 text-sm text-aviso">
                Este artículo ya salió en el boletín el {fecha(articulo.enviado_en)}. Si lo envías de nuevo, les llegará
                otra vez.
              </p>
            )}
            {confirmando ? (
              <div
                role="alertdialog"
                className="flex flex-wrap items-center gap-3 rounded-lg border border-marca/40 bg-marca-suave px-4 py-3 text-sm"
              >
                <span className="flex-1">
                  ¿Enviar <strong>{articulo?.titulo}</strong> a {cifra(confirmados)}{" "}
                  {confirmados === 1 ? "suscriptor" : "suscriptores"}? No se puede deshacer.
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="rounded-md border border-borde bg-superficie px-3 py-1.5"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={enviar}
                  className="rounded-md bg-marca px-3 py-1.5 font-semibold text-white hover:bg-marca-fuerte"
                >
                  Sí, enviar
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={probar}
                  disabled={ocupado || !elegido}
                  className="rounded-lg border border-borde px-4 py-2 text-sm font-semibold hover:border-marca disabled:opacity-60"
                >
                  Enviarme una prueba
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  disabled={ocupado || enCurso || !elegido || !confirmados}
                  className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white hover:bg-marca-fuerte disabled:opacity-60"
                >
                  Enviar a {cifra(confirmados)} {confirmados === 1 ? "suscriptor" : "suscriptores"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-texto-2">Publica un artículo para poder enviarlo.</p>
        )}

        {!!envios.length && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-bold">Últimos envíos</h3>
            <ul className="divide-y divide-borde rounded-xl border border-borde">
              {envios.map((e) => {
                const avance = e.total ? Math.round(((e.enviados + e.fallidos) / e.total) * 100) : 100;
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{e.asunto}</span>
                    <span className="text-xs text-texto-2" title={fecha(e.creado_en)}>
                      {hace(e.creado_en)}
                    </span>
                    {e.estado === "enviando" ? (
                      <span className="flex items-center gap-2 text-xs text-texto-2">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-marca-suave">
                          <span className="block h-full bg-marca" style={{ width: `${avance}%` }} />
                        </span>
                        {cifra(e.enviados)}/{cifra(e.total)}
                      </span>
                    ) : e.estado === "error" ? (
                      <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-semibold text-error">
                        Falló el servidor de correo ({cifra(e.enviados)}/{cifra(e.total)})
                      </span>
                    ) : (
                      <span className="rounded-full bg-marca-suave px-2 py-0.5 text-xs font-semibold text-marca-fuerte">
                        Enviado a {cifra(e.enviados)}
                        {e.fallidos ? ` · ${cifra(e.fallidos)} fallaron` : ""}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto font-bold">Suscriptores</h2>
          <button
            type="button"
            onClick={() =>
              descargar("/panel/newsletter/suscriptores.csv", "suscriptores.csv").catch((e) =>
                setError(mensaje(e, "No se pudo descargar.")),
              )
            }
            className="rounded-lg border border-borde bg-superficie px-3 py-2 text-sm font-semibold hover:border-marca"
          >
            Descargar CSV
          </button>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Estado"
            className="inline-flex rounded-lg border border-borde bg-superficie p-1"
          >
            {PESTANAS.map((p) => (
              <button
                key={p.estado}
                type="button"
                role="tab"
                aria-selected={estado === p.estado}
                onClick={() => cambiarPestana(p.estado)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold ${
                  estado === p.estado ? "bg-lateral text-white" : "text-texto-2 hover:text-texto"
                }`}
              >
                {p.texto}
                {datos && (
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${estado === p.estado ? "bg-white/20" : "bg-fondo"}`}
                  >
                    {datos.conteo[p.estado]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <label className="flex min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-borde bg-superficie sm:max-w-sm">
            <span className="sr-only">Buscar suscriptores</span>
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por correo"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            />
          </label>
        </div>

        {porEliminar && (
          <div
            role="alertdialog"
            className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm"
          >
            <span className="flex-1">
              ¿Borrar a <strong>{porEliminar.correo}</strong> de la lista? Si vuelve a suscribirse, tendrá que confirmar
              de nuevo.
            </span>
            <button
              type="button"
              onClick={() => setPorEliminar(null)}
              className="rounded-md border border-borde px-3 py-1.5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const s = porEliminar;
                setPorEliminar(null);
                hacer(async () => {
                  await pedir(`/panel/newsletter/suscriptores/${s.id}`, { metodo: "DELETE", conSesion: true });
                  return `Se borró ${s.correo}.`;
                }, cargarSuscriptores);
              }}
              className="rounded-md bg-error px-3 py-1.5 font-semibold text-white"
            >
              Borrar
            </button>
          </div>
        )}

        <Caja>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="bg-lateral text-lateral-texto">
                <tr>
                  <th className={TH}>Correo</th>
                  <th className={TH}>{pestana.columna}</th>
                  <th className={`${TH} w-20`}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {datos === null ? (
                  <tr>
                    <td colSpan={3} className={`${TD} text-center text-texto-2`}>
                      Cargando…
                    </td>
                  </tr>
                ) : datos.suscriptores.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={`${TD} text-center text-texto-2`}>
                      {q ? "Nadie coincide con la búsqueda." : pestana.vacio}
                    </td>
                  </tr>
                ) : (
                  datos.suscriptores.map((s) => (
                    <tr key={s.id} className="odd:bg-fondo/50">
                      <td className={TD}>{s.correo}</td>
                      <td className={TD} title={fecha(fechaDe(s))}>
                        {hace(fechaDe(s))}
                      </td>
                      <td className={TD}>
                        <GrupoAcciones>
                          <BotonAccion
                            tipo="eliminar"
                            titulo={`Borrar ${s.correo}`}
                            onClick={() => setPorEliminar(s)}
                          />
                        </GrupoAcciones>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Caja>
        {datos && datos.total > POR_PAGINA && (
          <div className="mt-4">
            <Paginacion pagina={pagina} porPagina={POR_PAGINA} total={datos.total} alCambiar={setPagina} />
          </div>
        )}
      </section>
    </div>
  );
}
