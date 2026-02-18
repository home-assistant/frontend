import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";

import {
  computeAdditionalMoreInfoAttributes,
  computeShownAttributes,
} from "../../src/data/entity/entity_attributes";

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

describe("computeAdditionalMoreInfoAttributes", () => {
  it("returns no additional attributes when main view already shows all", () => {
    const stateObj = {
      entity_id: "sensor.temperature",
      attributes: {
        friendly_name: "Office temperature",
        unit_of_measurement: "°C",
        temperature: 21,
        custom_value: "shown",
      },
    } as unknown as HassEntity;

    expect(computeAdditionalMoreInfoAttributes(stateObj, "default")).toEqual(
      []
    );
  });

  it("returns attributes hidden in the main view", () => {
    const stateObj = {
      entity_id: "light.office",
      attributes: {
        friendly_name: "Office light",
        brightness: 120,
        color_mode: "rgb",
        custom_value: "shown",
      },
    } as unknown as HassEntity;

    expect(computeAdditionalMoreInfoAttributes(stateObj, "light")).toEqual([
      "brightness",
      "color_mode",
    ]);
  });

  it("returns all shown attributes when main view has no attributes section", () => {
    const stateObj = {
      entity_id: "climate.office",
      attributes: {
        temperature: 21,
        hvac_mode: "heat",
        custom_value: "shown",
      },
    } as unknown as HassEntity;

    expect(computeAdditionalMoreInfoAttributes(stateObj, "climate")).toEqual([
      "temperature",
      "hvac_mode",
      "custom_value",
    ]);
  });
});
