import { describe, it, expect } from "vitest";
import { formatFCFA } from "../currency";

describe("formatFCFA", () => {
  it("formats integer amounts with thin spaces", () => {
    expect(formatFCFA(1500)).toMatch(/1.500 FCFA/);
    expect(formatFCFA(1234567)).toMatch(/1.234.567 FCFA/);
  });

  it("rounds decimals to nearest integer", () => {
    expect(formatFCFA(1499.4)).toMatch(/1.499 FCFA/);
    expect(formatFCFA(1499.6)).toMatch(/1.500 FCFA/);
  });

  it("handles null / undefined / NaN gracefully", () => {
    expect(formatFCFA(null)).toBe("0 FCFA");
    expect(formatFCFA(undefined)).toBe("0 FCFA");
    expect(formatFCFA("not-a-number")).toBe("0 FCFA");
  });

  it("parses numeric strings", () => {
    expect(formatFCFA("2500")).toMatch(/2.500 FCFA/);
  });

  it("handles zero and negatives", () => {
    expect(formatFCFA(0)).toBe("0 FCFA");
    expect(formatFCFA(-500)).toMatch(/-500 FCFA/);
  });
});
