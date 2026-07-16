import { describe, expect, it } from "vitest";

import {
  applyDefaultColor,
  migrateStateColorConfig,
} from "../../../../src/panels/lovelace/common/entity-color-config";

describe("migrateStateColorConfig", () => {
  it("converts state_color true to color state", () => {
    expect(migrateStateColorConfig({ state_color: true })).toEqual({
      color: "state",
    });
  });

  it("converts state_color false to color none", () => {
    expect(migrateStateColorConfig({ state_color: false })).toEqual({
      color: "none",
    });
  });

  it("keeps an explicit color over state_color", () => {
    expect(
      migrateStateColorConfig({ state_color: true, color: "red" })
    ).toEqual({ color: "red" });
  });

  it("keeps custom elements untouched", () => {
    const config = { type: "custom:foo", state_color: true };
    expect(migrateStateColorConfig(config)).toBe(config);
  });

  it("returns the same object when there is nothing to migrate", () => {
    const config = { color: "red" };
    expect(migrateStateColorConfig(config)).toBe(config);
  });
});

describe("applyDefaultColor", () => {
  interface TestEntityConfig {
    entity: string;
    type?: string;
    color?: string;
  }

  it("applies the default color when none is set", () => {
    const config: TestEntityConfig = { entity: "light.a" };
    expect(applyDefaultColor(config, "state")).toEqual({
      entity: "light.a",
      color: "state",
    });
  });

  it("keeps an explicit color", () => {
    const config: TestEntityConfig = { entity: "light.a", color: "red" };
    expect(applyDefaultColor(config, "state")).toBe(config);
  });

  it("returns the same object without a default color", () => {
    const config: TestEntityConfig = { entity: "light.a" };
    expect(applyDefaultColor(config, undefined)).toBe(config);
  });

  it("keeps custom elements untouched", () => {
    const config: TestEntityConfig = { entity: "light.a", type: "custom:foo" };
    expect(applyDefaultColor(config, "state")).toBe(config);
  });
});
