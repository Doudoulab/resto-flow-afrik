import { describe, it, expect } from "vitest";
import { computeTotals } from "../totals";

/**
 * Additional edge-case coverage for SYSCOHADA-conformant totals.
 * The base file totals.test.ts covers happy paths.
 */

describe("computeTotals — edge cases", () => {
  it("handles empty lines (zero everything)", () => {
    const r = computeTotals({
      lines: [],
      vatMode: "exclusive",
      defaultVatRate: 18,
      servicePct: 10,
      orderDiscountAmount: 0,
      tipAmount: 0,
    });
    expect(r.subtotal).toBe(0);
    expect(r.taxAmount).toBe(0);
    expect(r.serviceAmount).toBe(0);
    expect(r.total).toBe(0);
  });

  it("zero VAT rate behaves correctly in inclusive mode", () => {
    const r = computeTotals({
      lines: [{ quantity: 3, unit_price: 1000 }],
      vatMode: "inclusive",
      defaultVatRate: 0,
      servicePct: 0,
      orderDiscountAmount: 0,
      tipAmount: 0,
    });
    expect(r.subtotal).toBe(3000);
    expect(r.taxAmount).toBe(0);
    expect(r.total).toBe(3000);
  });

  it("mixed VAT rates per line", () => {
    const r = computeTotals({
      lines: [
        { quantity: 1, unit_price: 1000, vat_rate: 18 }, // 180 TVA
        { quantity: 2, unit_price: 500, vat_rate: 0 },   // 0 TVA
      ],
      vatMode: "exclusive",
      defaultVatRate: 18,
      servicePct: 0,
      orderDiscountAmount: 0,
      tipAmount: 0,
    });
    expect(r.subtotal).toBe(2000);
    expect(r.taxAmount).toBe(180);
    expect(r.total).toBe(2180);
  });

  it("order discount larger than total caps at 100%", () => {
    const r = computeTotals({
      lines: [{ quantity: 1, unit_price: 1000 }],
      vatMode: "exclusive",
      defaultVatRate: 0,
      servicePct: 0,
      orderDiscountAmount: 9999,
      tipAmount: 0,
    });
    expect(r.subtotal).toBe(0);
    expect(r.taxAmount).toBe(0);
    expect(r.total).toBe(0);
  });

  it("service is computed on HT only (after discount)", () => {
    const r = computeTotals({
      lines: [{ quantity: 1, unit_price: 1000, vat_rate: 18 }],
      vatMode: "exclusive",
      defaultVatRate: 0,
      servicePct: 10,
      orderDiscountAmount: 0,
      tipAmount: 0,
    });
    // HT 1000, TVA 180, service = 10% * HT(1000) = 100 (norme SYSCOHADA)
    expect(r.serviceAmount).toBe(100);
    expect(r.total).toBe(1280);
  });

  it("service after order discount uses discounted HT", () => {
    const r = computeTotals({
      lines: [{ quantity: 1, unit_price: 1000, vat_rate: 0 }],
      vatMode: "exclusive",
      defaultVatRate: 0,
      servicePct: 10,
      orderDiscountAmount: 200,
      tipAmount: 0,
    });
    // HT after discount = 800 → service = 80
    expect(r.subtotal).toBe(800);
    expect(r.serviceAmount).toBe(80);
    expect(r.total).toBe(880);
  });

  it("tip is added on top of total without VAT", () => {
    const r = computeTotals({
      lines: [{ quantity: 1, unit_price: 1000, vat_rate: 0 }],
      vatMode: "exclusive",
      defaultVatRate: 0,
      servicePct: 0,
      orderDiscountAmount: 0,
      tipAmount: 250,
    });
    expect(r.tipAmount).toBe(250);
    expect(r.total).toBe(1250);
  });

  it("rounds to 2 decimals", () => {
    const r = computeTotals({
      lines: [{ quantity: 1, unit_price: 333.333 }],
      vatMode: "exclusive",
      defaultVatRate: 18,
      servicePct: 0,
      orderDiscountAmount: 0,
      tipAmount: 0,
    });
    expect(Number.isFinite(r.total)).toBe(true);
    // Should not have more than 2 decimals
    expect(r.total.toString().split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});
