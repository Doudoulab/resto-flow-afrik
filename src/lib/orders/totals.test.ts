import { describe, it, expect } from "vitest";
import { computeTotals } from "./totals";

describe("computeTotals", () => {
  it("computes inclusive VAT correctly", () => {
    const r = computeTotals({
      lines: [{ quantity: 2, unit_price: 1100 }],
      vatMode: "inclusive",
      defaultVatRate: 10,
      servicePct: 0,
      orderDiscountAmount: 0,
      tipAmount: 0,
    });
    expect(r.subtotal).toBe(2000);
    expect(r.taxAmount).toBe(200);
    expect(r.total).toBe(2200);
  });

  it("computes exclusive VAT + service + tip", () => {
    const r = computeTotals({
      lines: [{ quantity: 1, unit_price: 1000 }],
      vatMode: "exclusive",
      defaultVatRate: 18,
      servicePct: 10,
      orderDiscountAmount: 0,
      tipAmount: 50,
    });
    expect(r.subtotal).toBe(1000);
    expect(r.taxAmount).toBe(180);
    expect(r.serviceAmount).toBe(118);
    expect(r.total).toBe(1348);
  });

  it("applies order-level discount proportionally", () => {
    const r = computeTotals({
      lines: [{ quantity: 1, unit_price: 1000, vat_rate: 20 }],
      vatMode: "exclusive",
      defaultVatRate: 0,
      servicePct: 0,
      orderDiscountAmount: 120,
      tipAmount: 0,
    });
    // gross = 1200, ratio = 0.1 → net 900, tax 180
    expect(r.subtotal).toBe(900);
    expect(r.taxAmount).toBe(180);
    expect(r.total).toBe(1080);
  });

  it("respects line-level discount", () => {
    const r = computeTotals({
      lines: [{ quantity: 2, unit_price: 500, discount_amount: 100 }],
      vatMode: "exclusive",
      defaultVatRate: 0,
      servicePct: 0,
      orderDiscountAmount: 0,
      tipAmount: 0,
    });
    expect(r.subtotal).toBe(900);
    expect(r.total).toBe(900);
  });
});