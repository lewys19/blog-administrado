import { describe, expect, it } from "vitest";

import { indice } from "./indice";

describe("indice", () => {
  it("toma los subtítulos con id", () => {
    const html =
      '<p>Intro</p><h2 id="que-es">¿Qué es <code>Docker</code>?</h2><h3 id="paso-1">Paso 1 &amp; 2</h3><h4 id="x">No</h4>';
    expect(indice(html)).toEqual([
      { id: "que-es", texto: "¿Qué es Docker?", nivel: 2 },
      { id: "paso-1", texto: "Paso 1 & 2", nivel: 3 },
    ]);
  });
});
