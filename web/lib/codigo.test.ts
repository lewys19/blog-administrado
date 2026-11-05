import { describe, expect, it } from "vitest";

import { BOTON_COPIAR, conBotonCopiar } from "./codigo";

describe("conBotonCopiar", () => {
  it("pone un botón en cada bloque de código", () => {
    const html = '<div class="codigo"><pre>a</pre></div><p>x</p><div class="codigo"><pre>b</pre></div>';
    expect(conBotonCopiar(html)).toBe(
      `<div class="codigo">${BOTON_COPIAR}<pre>a</pre></div><p>x</p><div class="codigo">${BOTON_COPIAR}<pre>b</pre></div>`,
    );
  });

  it("no toca el resto del contenido", () => {
    const html = "<p>Usa <code>print()</code> en tu código</p>";
    expect(conBotonCopiar(html)).toBe(html);
  });
});
