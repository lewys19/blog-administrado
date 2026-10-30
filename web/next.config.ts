import type { NextConfig } from "next";

// La web llama a la API en el mismo dominio (/api/v1/...): sin CORS y sin exponer otra URL.
// Next.js reenvía esas rutas al backend. El destino se fija al compilar:
// en Docker es http://api:8000; programando en tu equipo, la API del .venv o del compose.
const API_INTERNA = process.env.API_INTERNA ?? "http://localhost:8300";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Genera un servidor mínimo (.next/standalone) para una imagen Docker liviana.
  output: "standalone",
  // Solo en `npm run dev`: permite abrirla desde otra PC de la red local (p. ej. Windows → VM Kali).
  allowedDevOrigins: ["192.168.*.*"],
  async rewrites() {
    return [
      { source: "/api/v1/:ruta*", destination: `${API_INTERNA}/api/v1/:ruta*` },
      // Portadas de los artículos (almacén local de la API).
      { source: "/media/:ruta*", destination: `${API_INTERNA}/media/:ruta*` },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
