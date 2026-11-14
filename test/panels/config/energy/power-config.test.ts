import { describe, expect, it } from "vitest";

import type { BatterySourceTypeEnergyPreference } from "../../../../src/data/energy";
import {
  buildBatteryExcludeList,
  isPowerConfigValid,
} from "../../../../src/panels/config/energy/dialogs/power-config";

describe("isPowerConfigValid", () => {
  it("accepts any config when no power sensor is configured", () => {
    expect(isPowerConfigValid("none", {})).toBe(true);
    expect(isPowerConfigValid("none", { stat_rate: "sensor.power" })).toBe(
      true
    );
  });

  it("requires a rate statistic for the standard type", () => {
    expect(isPowerConfigValid("standard", {})).toBe(false);
    expect(isPowerConfigValid("standard", { stat_rate: "" })).toBe(false);
    expect(isPowerConfigValid("standard", { stat_rate: "sensor.power" })).toBe(
      true
    );
    expect(
      isPowerConfigValid("standard", { stat_rate_inverted: "sensor.power" })
    ).toBe(false);
  });

  it("requires an inverted rate statistic for the inverted type", () => {
    expect(isPowerConfigValid("inverted", {})).toBe(false);
    expect(isPowerConfigValid("inverted", { stat_rate: "sensor.power" })).toBe(
      false
    );
    expect(
      isPowerConfigValid("inverted", { stat_rate_inverted: "sensor.power" })
    ).toBe(true);
  });

  it("requires both statistics for the two sensors type", () => {
    expect(isPowerConfigValid("two_sensors", {})).toBe(false);
    expect(
      isPowerConfigValid("two_sensors", { stat_rate_from: "sensor.power_from" })
    ).toBe(false);
    expect(
      isPowerConfigValid("two_sensors", { stat_rate_to: "sensor.power_to" })
    ).toBe(false);
    expect(
      isPowerConfigValid("two_sensors", {
        stat_rate_from: "sensor.power_from",
        stat_rate_to: "sensor.power_to",
      })
    ).toBe(true);
  });

  it("rejects unknown power types", () => {
    expect(
      isPowerConfigValid("unexpected" as never, { stat_rate: "sensor.power" })
    ).toBe(false);
  });
});

describe("buildBatteryExcludeList", () => {
  const totals: BatterySourceTypeEnergyPreference = {
    type: "battery",
    stat_energy_from: "sensor.totals_discharged",
    stat_energy_to: "sensor.totals_charged",
    stat_rate: "sensor.totals_net_power",
    power_config: {
      stat_rate_from: "sensor.totals_discharge_power",
      stat_rate_to: "sensor.totals_charge_power",
    },
  };
  const directions: BatterySourceTypeEnergyPreference = {
    type: "battery",
    stat_energy_from_grid: "sensor.directions_from_grid",
    stat_energy_to_home: "sensor.directions_to_home",
    stat_rate: "sensor.directions_net_power",
    power_config: { stat_rate_to_home: "sensor.directions_to_home_power" },
  };

  it("excludes every statistic of the other batteries in both modes", () => {
    expect(
      buildBatteryExcludeList([totals, directions], { ...directions }).sort()
    ).toEqual([
      "sensor.totals_charge_power",
      "sensor.totals_charged",
      "sensor.totals_discharge_power",
      "sensor.totals_discharged",
      "sensor.totals_net_power",
    ]);
    expect(
      buildBatteryExcludeList([totals, directions], { ...totals }).sort()
    ).toEqual([
      "sensor.directions_from_grid",
      "sensor.directions_net_power",
      "sensor.directions_to_home",
      "sensor.directions_to_home_power",
    ]);
  });

  it("excludes all batteries for a new one", () => {
    expect(buildBatteryExcludeList([totals, directions])).toHaveLength(9);
  });
});
