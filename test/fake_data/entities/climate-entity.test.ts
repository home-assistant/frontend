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
});
