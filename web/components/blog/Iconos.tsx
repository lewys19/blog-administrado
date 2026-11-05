// Íconos de línea del blog (24×24, trazo de 1.8). Sin librerías.

const CATEGORIAS: Record<string, string> = {
  programacion: "M8 8 4 12l4 4m8-8 4 4-4 4M14 5l-4 14",
  python: "M4 5h16v14H4zM7 10l3 2-3 2m5 0h5",
  fastapi: "M13 3 5 14h6l-1 7 8-11h-6z",
  sql: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  qa: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4",
  ia: "M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3M6 6h12v12H6zm4 4h4v4h-4z",
  // Academia Digital
  "inteligencia-artificial": "M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3M6 6h12v12H6zm4 4h4v4h-4z",
  backend: "M4 4h16v6H4zm0 10h16v6H4zM8 7h.01M8 17h.01",
  "qa-testing": "M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8",
  devops: "M7 8a4 4 0 1 0 0 8c3 0 7-8 10-8a4 4 0 1 1 0 8c-3 0-7-8-10-8z",
  linux: "M4 5h16v14H4zM7 10l3 2-3 2m5 0h5",
  ciberseguridad: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zm-2 8h4v4h-4zm1 0V9a1 1 0 0 1 2 0v2",
  matematicas: "M4 20V4l16 16zM8 16h3.5L8 12.5z",
};
const CARPETA = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";

export function Icono({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Ícono de una categoría por su slug (las nuevas usan una carpeta). */
export function IconoCategoria({ slug, className }: { slug: string; className?: string }) {
  return <Icono d={CATEGORIAS[slug] ?? CARPETA} className={className} />;
}

export const ICONOS = {
  buscar: "m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z",
  calendario: "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  reloj: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  ojo: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  abajo: "m6 9 6 6 6-6",
  izquierda: "m15 6-6 6 6 6",
  derecha: "m9 6 6 6-6 6",
  check: "m5 12 5 5 9-10",
  mundo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z",
  correo: "M4 6h16v12H4zm0 0 8 7 8-7",
  enlace: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  rss: "M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8M6 19h.01",
  comentario: "M4 5h16v11H8l-4 4z",
  anuncio: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zm13-3a5 5 0 0 1 0 8",
  facebook: "M14 21v-7h2.5l.5-3h-3V9.2c0-.9.3-1.5 1.6-1.5H17V5.1A21 21 0 0 0 14.8 5C12.6 5 11 6.3 11 8.8V11H8.5v3H11v7",
  x: "M4 4l16 16M20 4 4 20",
  linkedin:
    "M6 10v8M6 6.5v.01M10 18v-8m0 4.5a3 3 0 0 1 6 0V18M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z",
  youtube:
    "M3 8.5C3 6.6 4.6 5 6.5 5h11C19.4 5 21 6.6 21 8.5v7c0 1.9-1.6 3.5-3.5 3.5h-11A3.5 3.5 0 0 1 3 15.5zM10 9v6l5-3z",
  github:
    "M9 19c-4 1.3-4-2-6-2.5m12 5V18a3.4 3.4 0 0 0-1-2.6c3.2-.4 6.5-1.6 6.5-7a5.4 5.4 0 0 0-1.5-3.8 5 5 0 0 0-.1-3.7s-1.2-.4-3.9 1.4a13.3 13.3 0 0 0-7 0C6.3.5 5.1.9 5.1.9A5 5 0 0 0 5 4.6a5.4 5.4 0 0 0-1.5 3.8c0 5.4 3.3 6.6 6.5 7A3.4 3.4 0 0 0 9 18v3.5",
  whatsapp: "M4 20l1.3-3.8A8 8 0 1 1 8 19zm5-11c0 3 3 6 6 6l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.3-2.3l.8-1-1-2z",
} as const;
