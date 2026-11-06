import { describe, expect, it } from "vitest";

import { enlacePromocion, enlaceWhatsapp, precioTexto, rutaCurso, seccionAcademia } from "./academia";

describe("precioTexto", () => {
  it("quita los decimales solo si el precio es exacto", () => {
    expect(precioTexto(8)).toBe("$8");
    expect(precioTexto(8.5)).toBe("$8.50");
    expect(precioTexto(0)).toBe("Gratis");
  });
});

describe("enlaceWhatsapp", () => {
  it("limpia el número y escribe el mensaje con el curso y su precio", () => {
    const url = new URL(
      enlaceWhatsapp("+51 999-888-777", { tipo: "curso", titulo: "Python desde Cero", precio: 9 }, "ZC-AB"),
    );
    expect(url.origin + url.pathname).toBe("https://wa.me/51999888777");
    expect(url.searchParams.get("text")).toBe(
      "Hola, quiero comprar el curso «Python desde Cero» ($9). Mi código es ZC-AB.",
    );
  });
});

describe("secciones", () => {
  it("cada tipo tiene su dirección y su forma de nombrarse", () => {
    expect(rutaCurso({ tipo: "sistema", slug: "pos" })).toBe("/academia/sistemas/pos");
    expect(seccionAcademia("manuales")).toBe("manuales");
    expect(seccionAcademia("constructor")).toBeNull();
    const url = new URL(enlaceWhatsapp("51999", { tipo: "separata", titulo: "SQL", precio: 2 }, "ZC-AB"));
    expect(url.searchParams.get("text")).toBe("Hola, quiero comprar la separata «SQL» ($2). Mi código es ZC-AB.");
  });
});

describe("enlacePromocion", () => {
  it("escribe el mensaje con la promoción y su precio", () => {
    const url = new URL(enlacePromocion("51999", { titulo: "2 cursos", precio: 10 }));
    expect(url.searchParams.get("text")).toBe("Hola, quiero la promoción «2 cursos» ($10).");
  });
});
