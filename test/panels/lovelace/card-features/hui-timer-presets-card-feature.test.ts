import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import { supportsTimerPresetsCardFeature } from "../../../../src/panels/lovelace/card-features/hui-timer-presets-card-feature";
import type { HomeAssistant } from "../../../../src/types";

const entity = (entityId: string): HassEntity =>
  ({
    entity_id: entityId,
    state: "idle",
    attributes: {},
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

const hassWith = (...entities: HassEntity[]): HomeAssistant =>
  ({
    states: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
  }) as unknown as HomeAssistant;

describe("supportsTimerPresetsCardFeature", () => {
  it("supports a timer entity", () => {
    const stateObj = entity("timer.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTimerPresetsCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(true);
  });

  it("does not support other domains", () => {
    const stateObj = entity("switch.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTimerPresetsCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("does not support a context with no entity_id", () => {
    const hass = hassWith();
    expect(supportsTimerPresetsCardFeature(hass, {})).toBe(false);
  });
});
