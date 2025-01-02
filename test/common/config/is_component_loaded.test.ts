import { describe, it, expect } from "vitest";
import { isComponentLoaded } from "../../../src/common/config/is_component_loaded";
import type { HomeAssistant } from "../../../src/types";

describe("isComponentLoaded", () => {
  it("should return if the component is loaded", () => {
    const hass = {
      config: { components: ["test_component"] },
    } as unknown as HomeAssistant;
    expect(isComponentLoaded(hass, "test_component")).toBe(true);
    expect(isComponentLoaded(hass, "other_component")).toBe(false);
  });
});
