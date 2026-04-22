import { describe, it, expect } from "vitest";
import {
  isModuleEnabled,
  getRequiredTier,
  DEFAULT_ENABLED,
  ALL_MODULES,
  ROUTE_MODULE_MAP,
  MODULE_PLAN_MAP,
} from "../modules";

describe("isModuleEnabled", () => {
  it("falls back to DEFAULT_ENABLED when no list is provided", () => {
    expect(isModuleEnabled(null, "kitchen")).toBe(true);
    expect(isModuleEnabled(undefined, "wines")).toBe(false);
  });

  it("respects explicit enabled list", () => {
    expect(isModuleEnabled(["wines"], "wines")).toBe(true);
    expect(isModuleEnabled(["wines"], "kitchen")).toBe(false);
  });

  it("treats empty list as nothing enabled", () => {
    expect(isModuleEnabled([], "kitchen")).toBe(false);
  });
});

describe("getRequiredTier", () => {
  it("returns free for unknown module key", () => {
    expect(getRequiredTier(undefined)).toBe("free");
  });

  it("maps Business-only modules correctly", () => {
    expect(getRequiredTier("multi_restaurant")).toBe("business");
    expect(getRequiredTier("white_label")).toBe("business");
    expect(getRequiredTier("api_webhooks")).toBe("business");
    expect(getRequiredTier("accounting")).toBe("business");
    expect(getRequiredTier("payroll")).toBe("business");
  });

  it("maps Pro modules correctly", () => {
    expect(getRequiredTier("wines")).toBe("pro");
    expect(getRequiredTier("gueridon")).toBe("pro");
    expect(getRequiredTier("audit")).toBe("pro");
  });

  it("maps Starter modules correctly", () => {
    expect(getRequiredTier("kitchen")).toBe("starter");
    expect(getRequiredTier("reports")).toBe("starter");
  });
});

describe("module catalog integrity", () => {
  it("every module has a plan tier", () => {
    for (const m of ALL_MODULES) {
      expect(MODULE_PLAN_MAP[m.key]).toBeDefined();
    }
  });

  it("every routed module exists in catalog", () => {
    const known = new Set(ALL_MODULES.map((m) => m.key));
    for (const key of Object.values(ROUTE_MODULE_MAP)) {
      expect(known.has(key)).toBe(true);
    }
  });

  it("DEFAULT_ENABLED only references known modules", () => {
    const known = new Set(ALL_MODULES.map((m) => m.key));
    for (const key of DEFAULT_ENABLED) {
      expect(known.has(key)).toBe(true);
    }
  });
});
