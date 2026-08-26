import { describe, expect, it } from "vitest";
import { SecurityViewStrategy } from "../../../../src/panels/security/strategies/security-view-strategy";
import { createMockHass } from "../../../fixtures/hass";

describe("security-view-strategy", () => {
  it("renders active alerts as individual cards in a visible section", async () => {
    const hass = createMockHass();
    hass.config = { ...hass.config, components: [] };

    const view = await SecurityViewStrategy.generate(
      {
        type: "security",
        alert_entities: [{ entity: "binary_sensor.window" }],
      },
      hass
    );

    const alertSection = view.sidebar?.sections?.[0];

    expect(alertSection?.visibility).toEqual([
      {
        condition: "or",
        conditions: [
          {
            condition: "and",
            conditions: [
              {
                condition: "state",
                entity: "binary_sensor.window",
                state: "on",
              },
            ],
          },
        ],
      },
    ]);
    expect(alertSection?.cards).toEqual([
      {
        type: "heading",
        heading: "ui.panel.lovelace.strategy.security.active_alerts",
        heading_style: "title",
      },
      {
        type: "alert",
        entity: "binary_sensor.window",
        color: "amber",
        visibility: [
          {
            condition: "state",
            entity: "binary_sensor.window",
            state: "on",
          },
        ],
        grid_options: { columns: 12 },
      },
    ]);
  });
});
