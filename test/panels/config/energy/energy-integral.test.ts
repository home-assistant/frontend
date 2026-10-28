import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";

import {
  findIntegral,
  integralUnits,
  pendingPowerIntegrals,
} from "../../../../src/panels/config/energy/dialogs/energy-integral";
import type { HomeAssistant } from "../../../../src/types";

const ENERGY_UNITS = ["GJ", "kWh", "MJ", "mWh", "MWh", "Wh"];

describe("integralUnits", () => {
  it("scales watt-hours up to kWh", () => {
    expect(integralUnits("W", ENERGY_UNITS)).toEqual({
      unit_time: "h",
      unit_prefix: "k",
    });
  });

  it("keeps units that already are energy units after integrating", () => {
    expect(integralUnits("kW", ENERGY_UNITS)).toEqual({ unit_time: "h" });
    expect(integralUnits("MW", ENERGY_UNITS)).toEqual({ unit_time: "h" });
    expect(integralUnits("mW", ENERGY_UNITS)).toEqual({ unit_time: "h" });
  });

  it("rejects units that do not integrate to an energy unit", () => {
    expect(integralUnits("BTU/h", ENERGY_UNITS)).toBeUndefined();
    expect(integralUnits("A", ENERGY_UNITS)).toBeUndefined();
    expect(integralUnits(undefined, ENERGY_UNITS)).toBeUndefined();
  });
});

describe("findIntegral", () => {
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
    expect(
      findIntegral(states, entities, "sensor.fridge_power", "energy")
    ).toBe("sensor.fridge_energy");
  });

  it("skips excluded helpers and other power sensors", () => {
    expect(
      findIntegral(states, entities, "sensor.fridge_power", "energy", [
        "sensor.fridge_energy",
      ])
    ).toBeUndefined();
    expect(
      findIntegral(states, entities, "sensor.oven_power", "energy")
    ).toBeUndefined();
  });
});

describe("pendingPowerIntegrals", () => {
  const states = {
    "sensor.import_power": { attributes: { unit_of_measurement: "W" } },
    "sensor.export_power": { attributes: { unit_of_measurement: "kW" } },
  } as unknown as HomeAssistant["states"];

  it("offers the missing energy of two power sensors", () => {
    expect(
      pendingPowerIntegrals(
        states,
        { stat_energy_from: "sensor.import_energy", stat_energy_to: null },
        "two_sensors",
        {
          stat_rate_from: "sensor.import_power",
          stat_rate_to: "sensor.export_power",
        },
        ENERGY_UNITS
      )
    ).toEqual([
      {
        energy: "stat_energy_to",
        rate: "sensor.export_power",
        units: { unit_time: "h" },
      },
    ]);
  });

  it("skips a signed power sensor", () => {
    expect(
      pendingPowerIntegrals(
        states,
        {},
        "standard",
        { stat_rate: "sensor.import_power" },
        ENERGY_UNITS
      )
    ).toEqual([]);
  });
});
