import { describe, expect, it } from "vitest";

import { ClimateEntityFeature } from "../../../src/data/climate";
import { MockClimateEntity } from "../../../src/fake_data/entities/climate-entity";

const hvacAction = (state: string, current: number, target: number) =>
  new MockClimateEntity({
    entity_id: "climate.demo",
    state,
    attributes: {
      supported_features: ClimateEntityFeature.TARGET_TEMPERATURE,
      current_temperature: current,
      temperature: target,
    },
  }).toState().attributes.hvac_action;

// A range of 20° to 24° only, like climate.upstairs in the arsaboo demo
const rangeHvacAction = (state: string, current: number) =>
  new MockClimateEntity({
    entity_id: "climate.demo",
    state,
    attributes: {
      supported_features:
        ClimateEntityFeature.TARGET_TEMPERATURE +
        ClimateEntityFeature.TARGET_TEMPERATURE_RANGE,
      current_temperature: current,
      temperature: null,
      target_temp_low: 20,
      target_temp_high: 24,
    },
  }).toState().attributes.hvac_action;

describe("MockClimateEntity", () => {
  it.each([
    ["heat", 18, 21, "heating"],
    ["heat", 21, 21, "idle"],
    ["cool", 25, 21, "cooling"],
    ["cool", 20, 21, "idle"],
    ["dry", 20, 21, "drying"],
    ["fan_only", 20, 21, "fan"],
    ["off", 18, 21, "off"],
  ])(
    "in %s at %d° with a target of %d° is %s",
    (state, current, target, action) => {
      expect(hvacAction(state, current, target)).toBe(action);
    }
  );

  it.each([
    ["heat", 18, "heating"],
    ["heat", 25, "idle"],
    ["cool", 25, "cooling"],
    ["cool", 18, "idle"],
    ["heat_cool", 18, "heating"],
    ["heat_cool", 25, "cooling"],
    ["auto", 22, "idle"],
  ])(
    "in %s at %d° with a range of 20° to 24° is %s",
    (state, current, action) => {
      expect(rangeHvacAction(state, current)).toBe(action);
    }
  );
});
