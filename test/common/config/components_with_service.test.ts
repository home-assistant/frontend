import { describe, it, expect } from "vitest";
import { componentsWithService } from "../../../src/common/config/components_with_service";
import type { HomeAssistant } from "../../../src/types";

describe("componentsWithService", () => {
  it("should return an array of domains with the service", () => {
    const hass = {
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
});
