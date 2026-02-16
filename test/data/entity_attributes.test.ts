import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";

import { computeShownAttributes } from "../../src/data/entity/entity_attributes";

describe("computeShownAttributes", () => {
  it("filters globally hidden attributes", () => {
    const stateObj = {
      entity_id: "sensor.temperature",
      attributes: {
        friendly_name: "Office temperature",
        unit_of_measurement: "°C",
        temperature: 21,
        custom_value: "shown",
      },
    } as unknown as HassEntity;

    expect(computeShownAttributes(stateObj)).toEqual([
      "temperature",
      "custom_value",
    ]);
  });

  it("filters domain and device class specific attributes", () => {
    const stateObj = {
      entity_id: "sensor.status",
      attributes: {
        device_class: "enum",
        options: ["home", "away"],
        current_option: "home",
      },
    } as unknown as HassEntity;

    expect(computeShownAttributes(stateObj)).toEqual(["current_option"]);
  });

  it("keeps device-class attributes for other device classes", () => {
    const stateObj = {
      entity_id: "sensor.status",
      attributes: {
        device_class: "temperature",
        options: ["home", "away"],
        current_option: "home",
      },
    } as unknown as HassEntity;

    expect(computeShownAttributes(stateObj)).toEqual([
      "options",
      "current_option",
    ]);
  });
});
