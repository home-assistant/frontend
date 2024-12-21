import { describe, it, expect } from "vitest";
import computeLocationName from "../../../src/common/config/location_name";
import type { HomeAssistant } from "../../../src/types";

describe("computeLocationName", () => {
  it("should return the correct location name", () => {
    const hass = {
      config: { location_name: "Home" },
    } as unknown as HomeAssistant;
    expect(computeLocationName(hass)).toBe("Home");
  });

  it("should return undefined if the location name is not set", () => {
    const hass = { config: {} } as unknown as HomeAssistant;
    expect(computeLocationName(hass)).toBeUndefined();
  });

  it("should return undefined if hass is not provided", () => {
    expect(
      computeLocationName(undefined as unknown as HomeAssistant)
    ).toBeUndefined();
  });
});
