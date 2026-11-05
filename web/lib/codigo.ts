// Pone el botón «Copiar» en cada bloque de código del HTML que llega de la API (services/markdown.py).
// Se hace al mostrar y no al guardar, para que también salga en los artículos ya publicados.

export const BOTON_COPIAR = '<button type="button" class="copiar-codigo" aria-label="Copiar código">Copiar</button>';

export function conBotonCopiar(html: string): string {
  return html.replace(/<div class="codigo">/g, (bloque) => bloque + BOTON_COPIAR);
}
