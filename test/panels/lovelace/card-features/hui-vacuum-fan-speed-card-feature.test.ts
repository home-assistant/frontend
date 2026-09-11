import { describe, expect, it } from "vitest";
import type { HassEntity } from "home-assistant-js-websocket";
import { supportsVacuumFanSpeedCardFeature } from "../../../../src/panels/lovelace/card-features/hui-vacuum-fan-speed-card-feature";
import { VacuumEntityFeature } from "../../../../src/data/vacuum";
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

describe("supportsVacuumFanSpeedCardFeature", () => {
  it("supports a vacuum entity with the FAN_SPEED feature flag", () => {
    const stateObj = entity("vacuum.test", {
      supported_features: VacuumEntityFeature.FAN_SPEED,
    });
    const hass = hassWith(stateObj);
    expect(
      supportsVacuumFanSpeedCardFeature(hass, {
        entity_id: stateObj.entity_id,
      })
    ).toBe(true);
  });

  it("does not support a vacuum entity without the FAN_SPEED feature flag", () => {
    const stateObj = entity("vacuum.test", { supported_features: 0 });
    const hass = hassWith(stateObj);
    expect(
      supportsVacuumFanSpeedCardFeature(hass, {
        entity_id: stateObj.entity_id,
      })
    ).toBe(false);
  });

  it("does not support other domains", () => {
    const stateObj = entity("light.test");
    const hass = hassWith(stateObj);
    expect(
      supportsVacuumFanSpeedCardFeature(hass, {
        entity_id: stateObj.entity_id,
      })
    ).toBe(false);
  });

  it("does not support a context with no entity_id", () => {
    const hass = hassWith();
    expect(supportsVacuumFanSpeedCardFeature(hass, {})).toBe(false);
  });
});
