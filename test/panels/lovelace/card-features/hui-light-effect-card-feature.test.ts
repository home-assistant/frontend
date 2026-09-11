import { describe, expect, it } from "vitest";
import type { HassEntity } from "home-assistant-js-websocket";
import { supportsLightEffectCardFeature } from "../../../../src/panels/lovelace/card-features/hui-light-effect-card-feature";
import { LightEntityFeature } from "../../../../src/data/light";
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

describe("supportsLightEffectCardFeature", () => {
  it("supports a light entity with EFFECT and a populated effect_list", () => {
    const stateObj = entity("light.test", {
      supported_features: LightEntityFeature.EFFECT,
      effect_list: ["candle", "fire"],
    });
    const hass = hassWith(stateObj);
    expect(
      supportsLightEffectCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(true);
  });

  it("does not support a light entity with EFFECT but an empty effect_list", () => {
    const stateObj = entity("light.test", {
      supported_features: LightEntityFeature.EFFECT,
      effect_list: [],
    });
    const hass = hassWith(stateObj);
    expect(
      supportsLightEffectCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("does not support a light entity with EFFECT but no effect_list", () => {
    const stateObj = entity("light.test", {
      supported_features: LightEntityFeature.EFFECT,
    });
    const hass = hassWith(stateObj);
    expect(
      supportsLightEffectCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("does not support a light entity without the EFFECT feature flag", () => {
    const stateObj = entity("light.test", {
      supported_features: 0,
      effect_list: ["candle", "fire"],
    });
    const hass = hassWith(stateObj);
    expect(
      supportsLightEffectCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("does not support other domains", () => {
    const stateObj = entity("switch.test");
    const hass = hassWith(stateObj);
    expect(
      supportsLightEffectCardFeature(hass, { entity_id: stateObj.entity_id })
    ).toBe(false);
  });

  it("does not support a context with no entity_id", () => {
    const hass = hassWith();
    expect(supportsLightEffectCardFeature(hass, {})).toBe(false);
  });
});
