// Dirección pública del blog (sin / al final): enlaces canónicos, sitemap, RSS y redes.
// En el servidor se configura con SITIO_URL; sin ella, la del equipo de desarrollo.
export const SITIO_URL = (process.env.SITIO_URL ?? "http://localhost:3300").replace(/\/$/, "");
export const NOMBRE_SITIO = "zcorp-stack";
