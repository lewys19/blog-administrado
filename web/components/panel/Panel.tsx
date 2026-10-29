"use client";

// Armazón del panel (backoffice): ingreso propio, barra lateral verde oscura y barra superior.
// Qué secciones se ven lo deciden los permisos de GET /yo; la API los vuelve a verificar en cada petición.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useState } from "react";

import { Isotipo } from "@/components/Logo";
import { ErrorApi, pedir } from "@/lib/api";
import { SECCIONES, type Seccion } from "@/lib/secciones";
import { guardarSesion, leerSesion, type Sesion } from "@/lib/sesion";
import type { Yo } from "@/lib/tipos";
import { useSesion } from "@/lib/usarSesion";

const ContextoPanel = createContext<Yo | null>(null);

/** Quien está en el panel. Solo dentro de <Panel>. */
export function usePanel(): Yo {
  const yo = useContext(ContextoPanel);
  if (!yo) throw new Error("usePanel fuera del panel");
  return yo;
}

export function puede(yo: Yo, permiso: string | undefined): boolean {
  return !permiso || yo.permisos.includes(permiso);
}

function Icono({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

async function salir() {
  const actual = leerSesion();
  if (actual) {
    await pedir("/auth/salir", { metodo: "POST", cuerpo: { token_refresco: actual.token_refresco } }).catch(() => {});
  }
  guardarSesion(null);
}

function FormIngreso() {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    setCargando(true);
    try {
      guardarSesion(
        await pedir<Sesion>("/auth/login", {
          metodo: "POST",
          cuerpo: { email: datos.get("email"), contrasena: datos.get("contrasena") },
        }),
      );
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No hay conexión con el servidor.");
      setCargando(false);
    }
  }

  const campo =
    "w-full rounded-lg border border-borde bg-superficie px-3.5 py-2.5 outline-none focus:border-marca focus:ring-2 focus:ring-marca/25";
  return (
    <form onSubmit={enviar} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-texto-2">Correo</span>
        <input name="email" type="email" autoComplete="username" required autoFocus className={campo} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-texto-2">Contraseña</span>
        <input name="contrasena" type="password" autoComplete="current-password" required className={campo} />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={cargando}
        className="w-full rounded-lg bg-lateral px-4 py-2.5 font-semibold text-white hover:bg-lateral-activo disabled:opacity-60"
      >
        {cargando ? "Un momento…" : "Ingresar"}
      </button>
    </form>
  );
}

function PantallaIngreso({ aviso }: { aviso?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Isotipo className="h-12 w-12" />
          <h1 className="text-xl font-bold tracking-tight">zcorp-stack · Panel</h1>
          <p className="text-sm text-texto-2">Ingresa con tu cuenta del equipo editorial.</p>
        </div>
        <div className="rounded-2xl border border-borde bg-superficie p-6 shadow-sm">{aviso ?? <FormIngreso />}</div>
      </div>
    </div>
  );
}

function Opcion({ s, activa, alElegir }: { s: Seccion; activa: boolean; alElegir: () => void }) {
  return (
    <Link
      href={`/admin${s.ruta ? `/${s.ruta}` : ""}`}
      onClick={alElegir}
      aria-current={activa ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
        activa ? "bg-lateral-activo font-semibold text-white" : "text-lateral-texto hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icono d={s.icono} />
      <span className="flex-1">{s.texto}</span>
      {s.sprint && (
        <span className="rounded-full bg-white/10 px-1.5 font-mono text-[10px] text-lateral-tenue" title={`Llega en el Sprint ${s.sprint}`}>
          S{s.sprint}
        </span>
      )}
    </Link>
  );
}

function BarraLateral({ yo, abierta, alCerrar }: { yo: Yo; abierta: boolean; alCerrar: () => void }) {
  const ruta = usePathname();
  const visibles = SECCIONES.filter((s) => puede(yo, s.permiso));
  const grupos = [null, "Contenido", "Comunidad", "Ingresos", "Herramientas"] as const;
  const activa = (s: Seccion) => (s.ruta ? ruta.startsWith(`/admin/${s.ruta}`) : ruta === "/admin");
  const cerrarEnCelular = () => window.innerWidth < 1024 && alCerrar();
  return (
    <>
      {abierta && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={alCerrar} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-lateral text-lateral-texto transition-transform lg:sticky lg:top-0 lg:h-screen lg:z-auto ${
          abierta ? "translate-x-0" : "-translate-x-full lg:hidden"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <Isotipo className="h-9 w-9" />
          <div className="leading-tight">
            <p className="font-bold text-white">zcorp-stack</p>
            <p className="text-xs text-lateral-tenue">Backoffice</p>
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label="Secciones del panel">
          {grupos.map((g) => {
            const items = visibles.filter((s) => s.grupo === g);
            if (!items.length) return null;
            return (
              <div key={g ?? "inicio"} className="space-y-0.5">
                {g && <p className="px-3 pb-1 font-mono text-[10px] tracking-widest text-lateral-tenue uppercase">{g}</p>}
                {items.map((s) => (
                  <Opcion key={s.ruta} s={s} activa={activa(s)} alElegir={cerrarEnCelular} />
                ))}
              </div>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-marca font-bold text-white">
            {yo.nombre.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{yo.nombre}</p>
            <p className="truncate text-xs text-lateral-tenue">{yo.rol}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

function BarraSuperior({ alAlternarMenu }: { alAlternarMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-borde bg-superficie/90 px-4 backdrop-blur">
      <button
        type="button"
        onClick={alAlternarMenu}
        aria-label="Mostrar u ocultar el menú"
        className="rounded-lg p-2 text-texto-2 hover:bg-fondo"
      >
        <Icono d="M3 6h18M3 12h18M3 18h18" />
      </button>
      <a href="/" target="_blank" rel="noreferrer" className="text-sm text-texto-2 hover:text-texto">
        Ver el sitio ↗
      </a>
      <button
        type="button"
        onClick={salir}
        className="ml-auto rounded-lg border border-borde px-3 py-1.5 text-sm hover:bg-fondo"
      >
        Salir
      </button>
    </header>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  const [yo, setYo] = useState<Yo | null>(null);
  const [error, setError] = useState<string | null>(null);
  // En el celular el menú empieza cerrado. (En el servidor no se dibuja: sin sesión se ve el ingreso.)
  const [menuAbierto, setMenuAbierto] = useState(() => typeof window === "undefined" || window.innerWidth >= 1024);
  const usuarioId = sesion?.usuario.id;

  useEffect(() => {
    if (!usuarioId) return;
    let vigente = true;
    pedir<Yo>("/yo", { conSesion: true })
      .then((datos) => vigente && (setYo(datos), setError(null)))
      .catch(() => vigente && setError("No se pudo cargar tu cuenta. Recarga la página."));
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  if (!sesion) return <PantallaIngreso />;
  const actual = yo?.id === usuarioId ? yo : null;
  if (error) return <PantallaIngreso aviso={<p className="text-center text-sm text-error">{error}</p>} />;
  if (!actual) return <div className="flex min-h-screen items-center justify-center text-texto-2">Cargando…</div>;
  if (!actual.en_panel) {
    return (
      <PantallaIngreso
        aviso={
          <div className="space-y-4 text-center text-sm">
            <p>
              La cuenta <strong>{actual.email}</strong> no tiene acceso al panel.
            </p>
            <button type="button" onClick={salir} className="w-full rounded-lg bg-lateral px-4 py-2.5 font-semibold text-white">
              Ingresar con otra cuenta
            </button>
          </div>
        }
      />
    );
  }

  return (
    <ContextoPanel.Provider value={actual}>
      <div className="flex min-h-screen">
        <BarraLateral yo={actual} abierta={menuAbierto} alCerrar={() => setMenuAbierto(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <BarraSuperior alAlternarMenu={() => setMenuAbierto((a) => !a)} />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ContextoPanel.Provider>
  );
}

/** Ruta de migas: Dashboard / Usuarios / … */
export function Migas({ items }: { items: { texto: string; href?: string }[] }) {
  return (
    <nav aria-label="Ruta" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-texto-2">
      <Link href="/admin" className="hover:text-texto">
        Dashboard
      </Link>
      {items.map((i) => (
        <span key={i.texto} className="flex items-center gap-1.5">
          <span aria-hidden="true">/</span>
          {i.href ? (
            <Link href={i.href} className="hover:text-texto">
              {i.texto}
            </Link>
          ) : (
            <span className="text-texto">{i.texto}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SinPermiso() {
  return (
    <p className="rounded-xl border border-borde bg-superficie p-6 text-center text-texto-2">
      Tu rol no tiene permiso para ver esta sección.
    </p>
  );
}
