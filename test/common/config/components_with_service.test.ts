import { describe, it, expect } from "vitest";
import { componentsWithService } from "../../../src/common/config/components_with_service";
import type { HomeAssistant } from "../../../src/types";

describe("componentsWithService", () => {
  it("should return an array of domains with the service", () => {
    const hass = {
      config: { components: ["domain1", "domain2"] },
      services: {
        domain1: { test_service: {} },
        domain2: { other_service: {} },
      },
    } as unknown as HomeAssistant;
    expect(componentsWithService(hass, "test_service")).toEqual(["domain1"]);
    expect(componentsWithService(hass, "other_service")).toEqual(["domain2"]);

    // empty if service is not found
    expect(componentsWithService(hass, "another_service")).toEqual([]);
  });

  it("skips described services of domains that are not loaded", () => {
    const hass = {
      config: { components: ["domain1"] },
      services: {
        domain1: { reload: {} },
        domain2: { reload: {} },
      },
    } as unknown as HomeAssistant;
    expect(componentsWithService(hass, "reload")).toEqual(["domain1"]);
  });
});
