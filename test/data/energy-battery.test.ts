import { describe, expect, it } from "vitest";
import type { BatterySourceTypeEnergyPreference } from "../../src/data/energy";
import { getBatteryCapacity } from "../../src/data/energy-battery";
import { createMockEntityState } from "../fixtures/hass";

const battery: BatterySourceTypeEnergyPreference = {
  type: "battery",
  stat_energy_from: "sensor.discharged",
  stat_energy_to: "sensor.charged",
};

describe("getBatteryCapacity", () => {
  it("preserves manual capacity and optional capacity", () => {
    expect(getBatteryCapacity({ ...battery, capacity: 5.76 }, {})).toBe(5.76);
    expect(getBatteryCapacity(battery, {})).toBeUndefined();
  });

  it.each([
    ["Wh", "5760"],
    ["kWh", "5.76"],
    ["MWh", "0.00576"],
  ])("converts %s to kWh", (unit, state) => {
    expect(
      getBatteryCapacity(
        { ...battery, entity_capacity: "sensor.capacity" },
        {
          "sensor.capacity": createMockEntityState("sensor.capacity", state, {
            unit_of_measurement: unit,
          }),
        }
      )
    ).toBeCloseTo(5.76);
  });

  it.each([
    ["unavailable", "kWh"],
    ["unknown", "kWh"],
    ["", "kWh"],
    [" ", "kWh"],
    ["0", "kWh"],
    ["-1", "kWh"],
    ["Infinity", "kWh"],
    ["NaN", "kWh"],
    ["5.76 kWh", "kWh"],
    ["5.76", "W"],
    ["5.76", undefined],
  ])("ignores invalid capacity %s %s", (state, unit) => {
    expect(
      getBatteryCapacity(
        { ...battery, entity_capacity: "sensor.capacity" },
        {
          "sensor.capacity": createMockEntityState("sensor.capacity", state, {
            unit_of_measurement: unit,
          }),
        }
      )
    ).toBeUndefined();
  });

  it("handles a missing sensor", () => {
    expect(
      getBatteryCapacity({ ...battery, entity_capacity: "sensor.capacity" }, {})
    ).toBeUndefined();
  });

  it("uses the current reading rather than a cached capacity", () => {
    const source = { ...battery, entity_capacity: "sensor.capacity" };
    expect(
      getBatteryCapacity(source, {
        "sensor.capacity": createMockEntityState("sensor.capacity", "5.76", {
          unit_of_measurement: "kWh",
        }),
      })
    ).toBe(5.76);
    expect(
      getBatteryCapacity(source, {
        "sensor.capacity": createMockEntityState("sensor.capacity", "4.8", {
          unit_of_measurement: "kWh",
        }),
      })
    ).toBe(4.8);
  });
});
