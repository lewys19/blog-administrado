import { describe, expect, it } from "vitest";

import { intensidad } from "./mapa";

describe("intensidad", () => {
  it("el país con más visitas va al máximo", () => {
    expect(intensidad(50, 50)).toBe(1);
  });

  it("con pocas visitas el país se sigue viendo y crece con ellas", () => {
    expect(intensidad(1, 10000)).toBeGreaterThan(0.25);
    expect(intensidad(100, 1000)).toBeGreaterThan(intensidad(10, 1000));
  });
});
