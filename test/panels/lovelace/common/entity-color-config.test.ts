import { describe, expect, it } from "vitest";

import { applyDefaultColor } from "../../../../src/panels/lovelace/common/entity-color-config";

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
