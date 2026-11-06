import { describe, expect, it } from "vitest";

import { aplicarFormato, FORMATOS, insertarBloque } from "./editor";

const formato = (titulo: string) => FORMATOS.find((f) => f.titulo === titulo)!;

describe("editor", () => {
  it("la negrita deja seleccionado el mismo texto", () => {
    const r = aplicarFormato("uno dos tres", 4, 7, formato("Negrita"));
    expect(r.texto).toBe("uno **dos** tres");
    expect(r.texto.slice(r.inicio, r.fin)).toBe("dos");
  });
  it("sin selección el cursor queda entre los asteriscos", () => {
    const r = aplicarFormato("hola ", 5, 5, formato("Negrita"));
    expect(r).toEqual({ texto: "hola ****", inicio: 7, fin: 7 });
  });
  it("deja fuera los saltos de línea de la selección", () => {
    const r = aplicarFormato("hola\n\nfin", 0, 6, formato("Negrita"));
    expect(r.texto).toBe("**hola**\n\nfin");
    expect(r.texto.slice(r.inicio, r.fin)).toBe("hola");
  });
  it("los títulos se reemplazan entre sí y el cursor sigue en su palabra", () => {
    const h1 = aplicarFormato("a\nHola", 4, 4, formato("Título 1"));
    expect(h1.texto).toBe("a\n# Hola");
    expect(h1.inicio).toBe(6);
    const h3 = aplicarFormato(h1.texto, h1.inicio, h1.fin, formato("Título 3"));
    expect(h3.texto).toBe("a\n### Hola");
    expect(h3.inicio).toBe(8);
  });
  it("inserta un bloque en líneas propias y deja el cursor después", () => {
    const r = insertarBloque("ab", 1, 1, "![x](y)");
    expect(r.texto).toBe("a\n\n![x](y)\n\nb");
    expect(r.inicio).toBe(12);
  });
});
