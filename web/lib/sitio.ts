// Dirección pública del blog (sin / al final): enlaces canónicos, sitemap, RSS y redes.
// En el servidor se configura con SITIO_URL; sin ella, la del equipo de desarrollo.
export const SITIO_URL = (process.env.SITIO_URL ?? "http://localhost:3300").replace(/\/$/, "");
export const NOMBRE_SITIO = "zcorp-stack";
export const LEMA = "Tecnología · IA · Programación";

/**
 * Redes del blog (encabezado y pie). Solo se muestran las que tienen dirección:
 * se configuran con variables de entorno hasta que llegue la sección Configuración del panel.
 */
export const REDES = (
  [
    ["facebook", "Facebook", process.env.RED_FACEBOOK],
    ["x", "X (Twitter)", process.env.RED_X],
    ["linkedin", "LinkedIn", process.env.RED_LINKEDIN],
    ["youtube", "YouTube", process.env.RED_YOUTUBE],
    ["github", "GitHub", process.env.RED_GITHUB],
  ] as const
)
  .filter(([, , url]) => !!url)
  .map(([red, nombre, url]) => ({ red, nombre, url: url as string }));

/** Número de WhatsApp de ventas de la Academia, con código de país (51999888777). */
export const WHATSAPP_ACADEMIA = process.env.WHATSAPP_ACADEMIA ?? "";

/** Correo de contacto público (opcional). */
export const CORREO_CONTACTO = process.env.CORREO_CONTACTO ?? "";
