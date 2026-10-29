import { describe, expect, it } from "vitest";

import { cifra, hace } from "./formato";

describe("formato", () => {
  it("separa miles", () => expect(cifra(4382)).toBe("4,382"));
  it("dice hace cuánto", () => {
    const ahora = new Date("2026-10-29T12:00:00Z");
    expect(hace("2026-10-29T11:55:00Z", ahora)).toBe("hace 5 min");
    expect(hace("2026-10-29T09:00:00Z", ahora)).toBe("hace 3 h");
    expect(hace("2026-10-27T12:00:00Z", ahora)).toBe("hace 2 días");
  });
});
