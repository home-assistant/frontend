import { describe, expect, it } from "vitest";
import type { HassEntity } from "home-assistant-js-websocket";
import { supportsTargetHumidityCardFeature } from "../../../../src/panels/lovelace/card-features/hui-target-humidity-card-feature";
import { ClimateEntityFeature } from "../../../../src/data/climate";
import type { HomeAssistant } from "../../../../src/types";

const entity = (
  entityId: string,
  attributes: HassEntity["attributes"] = {}
): HassEntity =>
  ({
    entity_id: entityId,
    state: "on",
    attributes,
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

const hassWith = (...entities: HassEntity[]): HomeAssistant =>
  ({
    states: Object.fromEntries(entities.map((e) => [e.entity_id, e])),
  }) as unknown as HomeAssistant;

describe("supportsTargetHumidityCardFeature", () => {
  it("supports a humidifier entity", () => {
    const stateObj = entity("humidifier.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTargetHumidityCardFeature(hass, {
        entity_id: stateObj.entity_id,
      })
    ).toBe(true);
  });

  it("supports a climate entity with the TARGET_HUMIDITY feature flag", () => {
    const stateObj = entity("climate.test", {
      supported_features: ClimateEntityFeature.TARGET_HUMIDITY,
    });
    const hass = hassWith(stateObj);
    expect(
      supportsTargetHumidityCardFeature(hass, {
        entity_id: stateObj.entity_id,
      })
    ).toBe(true);
  });

  it("does not support a climate entity without the TARGET_HUMIDITY feature flag", () => {
    const stateObj = entity("climate.test", { supported_features: 0 });
    const hass = hassWith(stateObj);
    expect(
      supportsTargetHumidityCardFeature(hass, {
        entity_id: stateObj.entity_id,
      })
    ).toBe(false);
  });

  it("does not support other domains", () => {
    const stateObj = entity("light.test");
    const hass = hassWith(stateObj);
    expect(
      supportsTargetHumidityCardFeature(hass, {
        entity_id: stateObj.entity_id,
      })
    ).toBe(false);
  });

  it("does not support a context with no entity_id", () => {
    const hass = hassWith();
    expect(supportsTargetHumidityCardFeature(hass, {})).toBe(false);
  });
});
