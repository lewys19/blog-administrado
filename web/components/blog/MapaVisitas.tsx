// Mapa de la portada: cada país se pinta según sus visitas de los últimos 30 días.
// lib/mapaMundo.json son los contornos de Natural Earth (dominio público) ya proyectados a SVG.
import { pais } from "@/lib/formato";
import { intensidad } from "@/lib/mapa";
import mundo from "@/lib/mapaMundo.json";
import type { Cuenta } from "@/lib/tipos";

export function MapaVisitas({ cuentas }: { cuentas: Cuenta[] }) {
  const visitas = new Map(cuentas.map((c) => [c.clave, c.visitas]));
  const maximo = Math.max(1, ...cuentas.map((c) => c.visitas));
  return (
    <svg
      viewBox={`0 0 ${mundo.ancho} ${mundo.alto}`}
      role="img"
      aria-label="Mapa del mundo con los países que nos visitan"
      className="mb-3 w-full"
    >
      {mundo.paises.map((p, i) => {
        const n = visitas.get(p.c);
        return (
          <path
            key={p.c || i}
            d={p.d}
            fill={n ? "var(--marca)" : "var(--borde)"}
            fillOpacity={n ? intensidad(n, maximo) : 1}
            stroke="var(--pagina)"
            strokeWidth="0.3"
          >
            {/* Un solo texto: con varias piezas, React deja <title> vacío en el servidor. */}
            {n && <title>{`${pais(p.c)}: ${n} ${n === 1 ? "visita" : "visitas"}`}</title>}
          </path>
        );
      })}
    </svg>
  );
}
