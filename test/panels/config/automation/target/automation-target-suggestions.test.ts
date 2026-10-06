import { describe, expect, it } from "vitest";
import type { AutomationConfig } from "../../../../../src/data/automation";
import {
  getAutomationTargets,
  rankSuggestedTargets,
} from "../../../../../src/panels/config/automation/target/automation-target-suggestions";

const config = {
  triggers: [
    { trigger: "state", entity_id: ["binary_sensor.door", "{{ x }}"] },
  ],
  conditions: [
    {
      condition: "or",
      conditions: [{ condition: "state", entity_id: "sun.sun", state: "x" }],
    },
  ],
  actions: [
    {
      if: [{ condition: "state", entity_id: "person.anna", state: "home" }],
      then: [{ action: "light.turn_on", target: { area_id: ["kitchen"] } }],
    },
    { action: "light.turn_off", target: { device_id: "lamp" } },
  ],
} as unknown as AutomationConfig;

describe("automation target suggestions", () => {
  it("groups targets by the element type that uses them, including nested ones", () => {
    expect(getAutomationTargets(config)).toEqual({
      trigger: [{ entity_id: "binary_sensor.door" }],
      condition: [{ entity_id: "sun.sun" }, { entity_id: "person.anna" }],
      action: [{ area_id: "kitchen" }, { device_id: "lamp" }],
    });
  });

  it("ranks recent targets first and prefers the same element type", () => {
    expect(
      rankSuggestedTargets(
        "action",
        [
          { type: "trigger", target: { entity_id: "binary_sensor.door" } },
          { type: "action", target: { area_id: "kitchen" } },
        ],
        getAutomationTargets(config)
      )
    ).toEqual([
      { area_id: "kitchen" },
      { entity_id: "binary_sensor.door" },
      { device_id: "lamp" },
      { entity_id: "person.anna" },
      { entity_id: "sun.sun" },
    ]);
  });
});
