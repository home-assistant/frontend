import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";

import {
  energyIntegralUnitPrefix,
  findEnergyIntegral,
} from "../../../../src/panels/config/energy/dialogs/energy-from-power";
import type { HomeAssistant } from "../../../../src/types";

const ENERGY_UNITS = ["GJ", "kWh", "MJ", "mWh", "MWh", "Wh"];

describe("energyIntegralUnitPrefix", () => {
  it("scales watt-hours up to kWh", () => {
    expect(energyIntegralUnitPrefix("W", ENERGY_UNITS)).toBe("k");
  });

  it("keeps units that already are energy units after integrating", () => {
    expect(energyIntegralUnitPrefix("kW", ENERGY_UNITS)).toBeNull();
    expect(energyIntegralUnitPrefix("MW", ENERGY_UNITS)).toBeNull();
    expect(energyIntegralUnitPrefix("mW", ENERGY_UNITS)).toBeNull();
  });

  it("rejects units that do not integrate to an energy unit", () => {
    expect(energyIntegralUnitPrefix("BTU/h", ENERGY_UNITS)).toBeUndefined();
    expect(energyIntegralUnitPrefix("A", ENERGY_UNITS)).toBeUndefined();
    expect(energyIntegralUnitPrefix(undefined, ENERGY_UNITS)).toBeUndefined();
  });
});

describe("findEnergyIntegral", () => {
  const state = (
    entityId: string,
    attributes: HassEntity["attributes"]
  ): HassEntity => ({
    entity_id: entityId,
    state: "1",
    attributes,
    last_changed: "",
    last_updated: "",
    context: { id: "", parent_id: null, user_id: null },
  });

  const states: HomeAssistant["states"] = {
    "sensor.fridge_power": state("sensor.fridge_power", {
      device_class: "power",
    }),
    "sensor.fridge_template_energy": state("sensor.fridge_template_energy", {
      device_class: "energy",
      source: "sensor.fridge_power",
    }),
    "sensor.fridge_energy": state("sensor.fridge_energy", {
      device_class: "energy",
      source: "sensor.fridge_power",
    }),
  };

  const entities = {
    "sensor.fridge_template_energy": {
      entity_id: "sensor.fridge_template_energy",
      platform: "template",
      labels: [],
    },
    "sensor.fridge_energy": {
      entity_id: "sensor.fridge_energy",
      platform: "integration",
      labels: [],
    },
  } as HomeAssistant["entities"];

  it("finds the Integral helper of the power sensor", () => {
    expect(findEnergyIntegral(states, entities, "sensor.fridge_power")).toBe(
      "sensor.fridge_energy"
    );
  });

  it("skips excluded helpers and other power sensors", () => {
    expect(
      findEnergyIntegral(states, entities, "sensor.fridge_power", [
        "sensor.fridge_energy",
      ])
    ).toBeUndefined();
    expect(
      findEnergyIntegral(states, entities, "sensor.oven_power")
    ).toBeUndefined();
  });
});
