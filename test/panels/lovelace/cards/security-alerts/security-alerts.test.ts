import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import {
  computeDefaultSecurityAlertVisibility,
  computeSecurityAlertEntityDefaultColor,
  computeSecurityAlertItems,
  type SecurityAlertHass,
} from "../../../../../src/panels/lovelace/cards/security-alerts/helpers";
import type { SecurityAlertsCardConfig } from "../../../../../src/panels/lovelace/cards/types";
import "../../../../../src/panels/lovelace/cards/security-alerts/hui-security-alerts-card";

const state = (
  entityId: string,
  value: string,
  deviceClass: string | undefined,
  lastChanged: string
): HassEntity => ({
  entity_id: entityId,
  state: value,
  attributes: {
    ...(deviceClass ? { device_class: deviceClass } : {}),
    friendly_name: entityId,
  },
  last_changed: lastChanged,
  last_updated: lastChanged,
  context: { id: "", parent_id: null, user_id: null },
});

const hass = (states: Record<string, HassEntity>): SecurityAlertHass => ({
  states,
  user: undefined,
  config: {
    time_zone: "UTC",
  } as SecurityAlertHass["config"],
  locale: {
    time_zone: "server",
  } as SecurityAlertHass["locale"],
});

describe("computeDefaultSecurityAlertVisibility", () => {
  it("defaults alarm panels to triggered", () => {
    expect(
      computeDefaultSecurityAlertVisibility("alarm_control_panel.house")
    ).toEqual([
      {
        condition: "state",
        entity: "alarm_control_panel.house",
        state: "triggered",
      },
    ]);
  });

  it("defaults binary sensors to on", () => {
    expect(computeDefaultSecurityAlertVisibility("binary_sensor.leak")).toEqual(
      [
        {
          condition: "state",
          entity: "binary_sensor.leak",
          state: "on",
        },
      ]
    );
  });

  it("defaults locks and covers to any unsecured state", () => {
    expect(computeDefaultSecurityAlertVisibility("lock.front_door")).toEqual([
      {
        condition: "state",
        entity: "lock.front_door",
        state_not: "locked",
      },
    ]);
    expect(computeDefaultSecurityAlertVisibility("cover.garage_door")).toEqual([
      {
        condition: "state",
        entity: "cover.garage_door",
        state_not: "closed",
      },
    ]);
  });

  it("defaults cameras to unavailable or unknown", () => {
    expect(computeDefaultSecurityAlertVisibility("camera.patio")).toEqual([
      {
        condition: "state",
        entity: "camera.patio",
        state: ["unavailable", "unknown"],
      },
    ]);
  });
});

describe("hui-security-alerts-card", () => {
  const createCard = () => document.createElement("hui-security-alerts-card");

  it("rejects a non-array alert entity configuration", () => {
    const card = createCard();

    expect(() =>
      card.setConfig({
        type: "security-alerts",
        alert_entities: "binary_sensor.window",
      } as unknown as SecurityAlertsCardConfig)
    ).toThrow("Invalid configuration");
  });

  it("rejects unsupported visibility conditions", () => {
    const card = createCard();

    expect(() =>
      card.setConfig({
        type: "security-alerts",
        alert_entities: [
          {
            entity: "binary_sensor.window",
            visibility: [
              { condition: "screen", media_query: "(min-width: 1px)" },
            ],
          },
        ],
      } as unknown as SecurityAlertsCardConfig)
    ).toThrow("Invalid configuration");
  });

  it.each([
    { entity: "" },
    { entity: "window" },
    { entity: "binary_sensor.window", color: 123 },
    { entity: "binary_sensor.window", pulse: "true" },
  ])("rejects invalid alert entity configuration %#", (alertEntity) => {
    const card = createCard();

    expect(() =>
      card.setConfig({
        type: "security-alerts",
        alert_entities: [alertEntity],
      } as unknown as SecurityAlertsCardConfig)
    ).toThrow("Invalid configuration");
  });
});

describe("computeSecurityAlertEntityDefaultColor", () => {
  it("uses device class defaults independent of current state", () => {
    expect(
      computeSecurityAlertEntityDefaultColor(
        state(
          "binary_sensor.carbon_monoxide",
          "unavailable",
          "carbon_monoxide",
          "2026-01-01T00:00:00Z"
        )
      )
    ).toBe("red");
    expect(
      computeSecurityAlertEntityDefaultColor(
        state(
          "binary_sensor.window",
          "unavailable",
          "window",
          "2026-01-01T00:00:00Z"
        )
      )
    ).toBe("amber");
    expect(
      computeSecurityAlertEntityDefaultColor(
        state("camera.patio", "unavailable", undefined, "2026-01-01T00:00:00Z")
      )
    ).toBe("blue");
  });
});

describe("computeSecurityAlertItems", () => {
  it("does not infer alerts without configured rows", () => {
    const states = {
      "binary_sensor.dishwasher_leak": state(
        "binary_sensor.dishwasher_leak",
        "on",
        "moisture",
        "2026-01-01T00:00:00Z"
      ),
    };

    expect(computeSecurityAlertItems(hass(states), [])).toEqual([]);
  });

  it("shows configured entities when their default visibility matches", () => {
    const states = {
      "binary_sensor.dishwasher_leak": state(
        "binary_sensor.dishwasher_leak",
        "on",
        "moisture",
        "2026-01-01T00:00:00Z"
      ),
    };

    expect(
      computeSecurityAlertItems(hass(states), [
        { entity: "binary_sensor.dishwasher_leak" },
      ]).map((item) => item.entityId)
    ).toEqual(["binary_sensor.dishwasher_leak"]);
  });

  it("shows carbon monoxide sensors when active", () => {
    const states = {
      "binary_sensor.carbon_monoxide": state(
        "binary_sensor.carbon_monoxide",
        "on",
        "carbon_monoxide",
        "2026-01-01T00:00:00Z"
      ),
    };

    expect(
      computeSecurityAlertItems(hass(states), [
        { entity: "binary_sensor.carbon_monoxide" },
      ]).map((item) => item.entityId)
    ).toEqual(["binary_sensor.carbon_monoxide"]);
  });

  it("hides configured entities when their default visibility does not match", () => {
    const states = {
      "binary_sensor.dishwasher_leak": state(
        "binary_sensor.dishwasher_leak",
        "off",
        "moisture",
        "2026-01-01T00:00:00Z"
      ),
    };

    expect(
      computeSecurityAlertItems(hass(states), [
        { entity: "binary_sensor.dishwasher_leak" },
      ])
    ).toEqual([]);
  });

  it("uses custom visibility conditions", () => {
    const states = {
      "lock.front_door": state(
        "lock.front_door",
        "unlocked",
        undefined,
        "2026-01-01T00:00:00Z"
      ),
    };

    expect(
      computeSecurityAlertItems(hass(states), [
        {
          entity: "lock.front_door",
          visibility: [
            {
              condition: "state",
              entity: "lock.front_door",
              state: "unlocked",
            },
          ],
        },
      ]).map((item) => item.entityId)
    ).toEqual(["lock.front_door"]);
  });

  it("applies configured color and pulse", () => {
    const states = {
      "binary_sensor.window": state(
        "binary_sensor.window",
        "on",
        "window",
        "2026-01-01T00:00:00Z"
      ),
    };

    expect(
      computeSecurityAlertItems(hass(states), [
        {
          entity: "binary_sensor.window",
          color: "red",
          pulse: false,
        },
      ])[0]
    ).toMatchObject({ color: "red", pulse: false });
  });

  it("uses the entity default color when color is not configured", () => {
    const states = {
      "binary_sensor.window": state(
        "binary_sensor.window",
        "on",
        "window",
        "2026-01-01T00:00:00Z"
      ),
    };

    expect(
      computeSecurityAlertItems(hass(states), [
        { entity: "binary_sensor.window" },
      ])[0]
    ).toMatchObject({ color: "amber" });
  });

  it("keeps no color as an explicit color choice", () => {
    const states = {
      "binary_sensor.window": state(
        "binary_sensor.window",
        "on",
        "window",
        "2026-01-01T00:00:00Z"
      ),
    };

    expect(
      computeSecurityAlertItems(hass(states), [
        { entity: "binary_sensor.window", color: "none" },
      ])[0]
    ).toMatchObject({ color: "none" });
  });

  it("keeps configured order", () => {
    const states = {
      "binary_sensor.window": state(
        "binary_sensor.window",
        "on",
        "window",
        "2026-01-01T00:02:00Z"
      ),
      "binary_sensor.leak": state(
        "binary_sensor.leak",
        "on",
        "moisture",
        "2026-01-01T00:01:00Z"
      ),
    };

    expect(
      computeSecurityAlertItems(hass(states), [
        { entity: "binary_sensor.window" },
        { entity: "binary_sensor.leak" },
      ]).map((item) => item.entityId)
    ).toEqual(["binary_sensor.window", "binary_sensor.leak"]);
  });
});
