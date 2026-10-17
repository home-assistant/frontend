import { describe, expect, it } from "vitest";
import {
  computeDefaultSecurityAlertVisibility,
  computeSecurityAlertCardConfig,
  isSecurityAlertActive,
} from "../../../../src/panels/security/strategies/security-alerts";
import { createMockEntityState } from "../../../fixtures/hass";

describe("computeDefaultSecurityAlertVisibility", () => {
  it.each([
    ["alarm_control_panel.house", { state: "triggered" }],
    ["binary_sensor.leak", { state: "on" }],
    ["cover.garage_door", { state: "open" }],
    [
      "lock.front_door",
      {
        state: ["jammed", "unlocked", "open"],
      },
    ],
  ])("uses the active state for %s", (entityId, stateCondition) => {
    expect(computeDefaultSecurityAlertVisibility(entityId)).toEqual([
      {
        condition: "state",
        entity: entityId,
        ...stateCondition,
      },
    ]);
  });
});

describe("isSecurityAlertActive", () => {
  it.each([
    ["alarm_control_panel.house", "triggered", true],
    ["alarm_control_panel.house", "armed_away", false],
    ["binary_sensor.leak", "on", true],
    ["binary_sensor.leak", "off", false],
    ["cover.garage_door", "open", true],
    ["cover.garage_door", "closed", false],
    ["lock.front_door", "unlocked", true],
    ["lock.front_door", "jammed", true],
    ["lock.front_door", "open", true],
    ["lock.front_door", "locked", false],
  ])("%s in state %s is active: %s", (entityId, state, active) => {
    const states = { [entityId]: createMockEntityState(entityId, state) };
    expect(isSecurityAlertActive(states, entityId)).toBe(active);
  });

  it("is not active for a missing entity", () => {
    expect(isSecurityAlertActive({}, "lock.front_door")).toBe(false);
  });
});

describe("computeSecurityAlertCardConfig", () => {
  it("maps alert severity to a red alert card", () => {
    expect(
      computeSecurityAlertCardConfig(undefined, {
        entity: "binary_sensor.smoke",
        severity: "alert",
      })
    ).toEqual({
      type: "alert",
      entity: "binary_sensor.smoke",
      color: "red",
      visibility: [
        {
          condition: "state",
          entity: "binary_sensor.smoke",
          state: "on",
        },
      ],
    });
  });

  it.each(["glass_break", "smoke"])(
    "uses the %s device class for the default severity",
    (deviceClass) => {
      const stateObj = createMockEntityState(
        `binary_sensor.${deviceClass}`,
        "off",
        {
          device_class: deviceClass,
        }
      );

      expect(
        computeSecurityAlertCardConfig(stateObj, {
          entity: stateObj.entity_id,
        }).color
      ).toBe("red");
    }
  );
});
