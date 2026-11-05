import { describe, expect, it } from "vitest";

import { enlaceWhatsapp, precioTexto, rutaCurso, seccionAcademia } from "./academia";

describe("precioTexto", () => {
  it("quita los decimales solo si el precio es exacto", () => {
    expect(precioTexto(8)).toBe("$8");
    expect(precioTexto(8.5)).toBe("$8.50");
    expect(precioTexto(0)).toBe("Gratis");
  });
});

describe("enlaceWhatsapp", () => {
  it("limpia el número y escribe el mensaje con el curso y su precio", () => {
    const url = new URL(enlaceWhatsapp("+51 999-888-777", { tipo: "curso", titulo: "Python desde Cero", precio: 9 }));
    expect(url.origin + url.pathname).toBe("https://wa.me/51999888777");
    expect(url.searchParams.get("text")).toBe("Hola, quiero comprar el curso «Python desde Cero» ($9).");
  });
});

describe("secciones", () => {
  it("cada tipo tiene su dirección y su forma de nombrarse", () => {
    expect(rutaCurso({ tipo: "sistema", slug: "pos" })).toBe("/academia/sistemas/pos");
    expect(seccionAcademia("manuales")).toBe("manuales");
    expect(seccionAcademia("constructor")).toBeNull();
    const url = new URL(enlaceWhatsapp("51999", { tipo: "separata", titulo: "SQL", precio: 2 }));
    expect(url.searchParams.get("text")).toBe("Hola, quiero comprar la separata «SQL» ($2).");
  });
});
