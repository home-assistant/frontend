import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import { computeTimelineColor } from "../../../src/components/chart/timeline-color";
import { createMockComputedStyle } from "../../fixtures/computed-style";

const entity = (
  entity_id: string,
  attributes: Record<string, unknown> = {}
): HassEntity =>
  ({
    entity_id,
    state: "",
    attributes,
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

describe("computeTimelineColor", () => {
  it("uses a themed color for a custom state of an uncolored domain", () => {
    const styles = createMockComputedStyle({
      "--state-sensor-heating-color": "#ff0000",
      "--state-sensor-power-heating-color": "#00ff00",
    });

    expect(
      computeTimelineColor("Heating", styles, entity("sensor.heat_pump"))
    ).toBe("#ff0000");
    expect(
      computeTimelineColor(
        "Heating",
        styles,
        entity("sensor.heat_pump", { device_class: "power" })
      )
    ).toBe("#00ff00");
  });

  it("keeps active/inactive fallbacks away from uncolored domains", () => {
    const styles = createMockComputedStyle({
      "--state-active-color": "#123456",
      "--state-sensor-active-color": "#654321",
    });

    expect(
      computeTimelineColor("Heating", styles, entity("sensor.heat_pump"))
    ).not.toMatch(/^#(123456|654321)$/);
  });
});
