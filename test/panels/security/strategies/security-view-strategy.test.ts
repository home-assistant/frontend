import { describe, expect, it } from "vitest";
import { SecurityViewStrategy } from "../../../../src/panels/security/strategies/security-view-strategy";
import { createMockHass } from "../../../fixtures/hass";

describe("security-view-strategy", () => {
  it("uses active alert visibility for an alert-only sidebar", async () => {
    const hass = createMockHass();
    hass.config = { ...hass.config, components: [] };

    const view = await SecurityViewStrategy.generate(
      {
        type: "security",
        alert_entities: [{ entity: "binary_sensor.window" }],
      },
      hass
    );

    expect(view.sidebar?.visibility).toEqual([
      {
        condition: "or",
        conditions: [
          {
            condition: "state",
            entity: "binary_sensor.window",
            state: "on",
          },
        ],
      },
    ]);
  });
});
