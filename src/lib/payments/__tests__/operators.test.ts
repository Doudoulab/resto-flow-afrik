import { describe, it, expect } from "vitest";
import {
  COUNTRIES,
  getCountry,
  getOperatorDef,
  buildPaymentLink,
} from "../operators";

describe("operators catalog", () => {
  it("contains all 10 supported countries", () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(10);
    expect(COUNTRIES.find((c) => c.code === "sn")).toBeDefined();
    expect(COUNTRIES.find((c) => c.code === "ci")).toBeDefined();
  });

  it("each country has at least one operator", () => {
    for (const c of COUNTRIES) {
      expect(c.operators.length).toBeGreaterThan(0);
    }
  });
});

describe("getCountry", () => {
  it("returns first country for unknown code", () => {
    expect(getCountry("xx").code).toBe(COUNTRIES[0].code);
    expect(getCountry(null).code).toBe(COUNTRIES[0].code);
  });

  it("is case-insensitive", () => {
    expect(getCountry("SN").code).toBe("sn");
  });
});

describe("getOperatorDef", () => {
  it("finds Wave for Senegal", () => {
    const op = getOperatorDef("sn", "wave");
    expect(op?.code).toBe("wave");
    expect(op?.action).toBe("deeplink");
  });

  it("returns undefined for unknown operator", () => {
    expect(getOperatorDef("sn", "doesnotexist")).toBeUndefined();
  });
});

describe("buildPaymentLink — Wave", () => {
  it("builds merchant deeplink when merchantId provided", () => {
    const r = buildPaymentLink({
      countryCode: "sn",
      operatorCode: "wave",
      merchantId: "M_12345",
      amount: 1500,
    });
    expect(r?.kind).toBe("deeplink");
    expect(r?.url).toContain("pay.wave.com/m/M_12345");
    expect(r?.url).toContain("amount=1500");
  });

  it("builds personal deeplink with phone when no merchantId", () => {
    const r = buildPaymentLink({
      countryCode: "sn",
      operatorCode: "wave",
      accountNumber: "771234567",
      amount: 2000,
    });
    expect(r?.kind).toBe("deeplink");
    expect(r?.url).toContain("pay.wave.com");
    expect(r?.url).toContain("amount=2000");
    // 9-digit number gets +221 prefix
    expect(decodeURIComponent(r!.url)).toContain("+221771234567");
  });

  it("flags needsManual when no merchant and no number", () => {
    const r = buildPaymentLink({
      countryCode: "sn",
      operatorCode: "wave",
      amount: 1000,
    });
    expect(r?.needsManual).toBe(true);
  });
});

describe("buildPaymentLink — USSD operators", () => {
  it("builds tel: link with encoded # for Orange Money SN", () => {
    const r = buildPaymentLink({
      countryCode: "sn",
      operatorCode: "orange_money",
      accountNumber: "771112233",
      amount: 5000,
    });
    expect(r?.kind).toBe("ussd");
    expect(r?.url.startsWith("tel:")).toBe(true);
    expect(r?.url).toContain("%23"); // encoded #
    expect(r?.url).toContain("5000");
    expect(r?.url).toContain("771112233");
  });

  it("strips spaces and dashes from account number", () => {
    const r = buildPaymentLink({
      countryCode: "sn",
      operatorCode: "orange_money",
      accountNumber: "+221 77-111 22 33",
      amount: 1000,
    });
    expect(r?.url).toContain("221771112233");
  });

  it("uses custom USSD override when provided", () => {
    const r = buildPaymentLink({
      countryCode: "ci",
      operatorCode: "moov_money",
      customUssd: "*999*{number}*{amount}#",
      accountNumber: "0102030405",
      amount: 750,
    });
    expect(r?.kind).toBe("ussd");
    expect(r?.url).toContain("%23");
    expect(r?.url).toContain("750");
  });

  it("uses custom deeplink override when provided", () => {
    const r = buildPaymentLink({
      countryCode: "ci",
      operatorCode: "mtn_momo",
      customDeeplink: "https://example.com/pay?amount={amount}",
      amount: 1234,
    });
    expect(r?.kind).toBe("deeplink");
    expect(r?.url).toBe("https://example.com/pay?amount=1234");
  });

  it("returns null for unknown operator", () => {
    expect(
      buildPaymentLink({
        countryCode: "sn",
        operatorCode: "fake",
        amount: 100,
      }),
    ).toBeNull();
  });
});
