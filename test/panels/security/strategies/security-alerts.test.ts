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
