import { describe, expect, it } from "vitest";

import { cifra, duracion, esUrlImagen, etiquetaFecha, hace, imagenMarkdown, pais, variacion } from "./formato";

describe("formato", () => {
  it("separa miles", () => expect(cifra(4382)).toBe("4,382"));
  it("arma la imagen en Markdown", () => {
    expect(imagenMarkdown("Mi foto", "/media/contenido/a.webp")).toBe("![Mi foto](/media/contenido/a.webp)");
    expect(imagenMarkdown("a [b]", " https://x.com/mi foto(1).png ")).toBe(
      "![a  b](https://x.com/mi%20foto%281%29.png)",
    );
  });
  it("solo acepta imágenes por https", () => {
    expect(esUrlImagen("https://x.com/a.png")).toBe(true);
    expect(esUrlImagen("http://x.com/a.png")).toBe(false);
    expect(esUrlImagen("javascript:alert(1)")).toBe(false);
    expect(esUrlImagen("no es url")).toBe(false);
  });
  it("dice hace cuánto", () => {
    const ahora = new Date("2026-10-29T12:00:00Z");
    expect(hace("2026-10-29T11:55:00Z", ahora)).toBe("hace 5 min");
    expect(hace("2026-10-29T09:00:00Z", ahora)).toBe("hace 3 h");
    expect(hace("2026-10-27T12:00:00Z", ahora)).toBe("hace 2 días");
  });

  it("arma las cifras de las estadísticas", () => {
    expect(duracion(40)).toBe("40 s");
    expect(duracion(125)).toBe("2 min 05 s");
    expect(variacion(150, 100)).toBe("+50%");
    expect(variacion(90, 100)).toBe("−10%");
    expect(variacion(5, 0)).toBeNull();
    expect(pais("PE")).toBe("Perú");
    expect(pais(null)).toBe("Desconocido");
    expect(etiquetaFecha("2026-10-29")).toBe("29 oct");
    expect(etiquetaFecha("2026-10")).toBe("oct 2026");
    expect(etiquetaFecha("2026-10", true)).toBe("oct");
  });
});
