import { describe, expect, it } from "vitest";
import {
  computeDefaultSecurityAlertVisibility,
  computeSecurityAlertCardConfig,
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
      pulse: true,
      visibility: [
        {
          condition: "state",
          entity: "binary_sensor.smoke",
          state: "on",
        },
      ],
    });
  });

  it("uses the entity device class for the default severity", () => {
    const stateObj = createMockEntityState("binary_sensor.smoke", "off", {
      device_class: "smoke",
    });

    expect(
      computeSecurityAlertCardConfig(stateObj, {
        entity: "binary_sensor.smoke",
      }).color
    ).toBe("red");
  });
});
