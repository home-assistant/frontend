import { startOfDay } from "date-fns";
import type { HassConfig } from "home-assistant-js-websocket";
import { assert, describe, it } from "vitest";

import { calcDate } from "../../src/common/datetime/calc_date";
import {
  type FrontendLocaleData,
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../src/data/translation";
import {
  computeConsumptionData,
  computeConsumptionSingle,
  computeEnergyLabel,
  computeEnergyDeviceLabels,
  formatConsumptionShort,
  calculateSolarConsumedGauge,
  formatPowerShort,
  getNextEnergyPeriodStart,
  getEnergyDefaultPeriodStorageKey,
  getSummedData,
} from "../../src/data/energy";
import {
  generateEnergyData,
  generateEnergyPreferences,
} from "../fixtures/energy";
import type { DeviceRegistryEntry } from "../../src/data/device/device_registry";
import type { EntityRegistryDisplayEntry } from "../../src/data/entity/entity_registry";
import type { StatisticsMetaData } from "../../src/data/recorder";
import type { HomeAssistant } from "../../src/types";
import { createMockEntityState, createMockHass } from "../fixtures/hass";

const checkConsumptionResult = (
  input: {
    from_grid: number | undefined;
    to_grid: number | undefined;
    solar: number | undefined;
    to_battery: number | undefined;
    from_battery: number | undefined;
    ev?: number | undefined;
  },
  exact = true
): {
  grid_to_battery: number;
  battery_to_grid: number;
  solar_to_battery: number;
  solar_to_grid: number;
  used_solar: number;
  used_grid: number;
  used_battery: number;
  used_total: number;
} => {
  const result = computeConsumptionSingle(input);
  if (exact) {
    // The source split covers home *and* the categorized EV load; with no EV
    // configured the ev_* terms are all 0 and this is the original invariant.
    assert.equal(
      result.used_total,
      result.used_solar +
        result.used_battery +
        result.used_grid +
        result.ev_solar +
        result.ev_battery +
        result.ev_grid
    );
    assert.equal(result.used_total, result.used_home + result.used_ev);
    assert.equal(
      input.to_grid || 0,
      result.solar_to_grid + result.battery_to_grid
    );
    assert.equal(
      input.to_battery || 0,
      result.grid_to_battery + result.solar_to_battery
    );
    assert.equal(
      input.solar || 0,
      result.solar_to_battery +
        result.solar_to_grid +
        result.used_solar +
        result.ev_solar
    );
  }
  // Only the pre-existing keys are returned so the expectations below stay
  // focused on the source waterfall. EV splitting is covered separately.
  const {
    used_home: _used_home,
    used_ev: _used_ev,
    ev_solar: _ev_solar,
    ev_grid: _ev_grid,
    ev_battery: _ev_battery,
    ...rest
  } = result;
  return rest;
};

describe("Energy Short Format Test", () => {
  // Create default to not have to specify a not relevant TimeFormat over and over again.
  const defaultLocale: FrontendLocaleData = {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
    date_format: DateFormat.language,
    time_zone: TimeZone.local,
    first_weekday: FirstWeekday.language,
  };

  const hass = { locale: defaultLocale } as HomeAssistant;
  it("No Unit conversion", () => {
    assert.strictEqual(formatConsumptionShort(hass, 0, "Wh"), "0 Wh");
    assert.strictEqual(formatConsumptionShort(hass, 0, "kWh"), "0 Wh");
    assert.strictEqual(formatConsumptionShort(hass, 0, "kWh", "kWh"), "0 kWh");
    assert.strictEqual(formatConsumptionShort(hass, 0, "GWh"), "0 Wh");
    assert.strictEqual(formatConsumptionShort(hass, 0, "GWh", "GWh"), "0 GWh");
    assert.strictEqual(formatConsumptionShort(hass, 0, "gal"), "0 gal");

    assert.strictEqual(
      formatConsumptionShort(hass, 10000.12345, "gal"),
      "10,000 gal"
    );

    assert.strictEqual(formatConsumptionShort(hass, 1.2345, "kWh"), "1.23 kWh");
    assert.strictEqual(
      formatConsumptionShort(hass, 10.12345, "kWh"),
      "10.1 kWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 500.12345, "kWh"),
      "500 kWh"
    );

    assert.strictEqual(formatConsumptionShort(hass, 10.01, "kWh"), "10 kWh");
  });
  it("Upward Unit conversion", () => {
    assert.strictEqual(
      formatConsumptionShort(hass, 1512.34567, "kWh"),
      "1.51 MWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 15123.4567, "kWh"),
      "15.1 MWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 151234.5678, "kWh"),
      "151 MWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 1512345.6789, "kWh"),
      "1.51 GWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 15123456789.9, "kWh"),
      "15.1 TWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 15123456789000.9, "kWh"),
      "15,123 TWh"
    );
  });
  it("Downward Unit conversion", () => {
    assert.strictEqual(formatConsumptionShort(hass, 0.00012, "kWh"), "0.12 Wh");
    assert.strictEqual(formatConsumptionShort(hass, 0.12345, "kWh"), "123 Wh");
    assert.strictEqual(
      formatConsumptionShort(hass, 0.00001234, "TWh"),
      "12.3 MWh"
    );
  });
  it("Negativ Consumption", () => {
    assert.strictEqual(
      formatConsumptionShort(hass, -500.123, "kWh"),
      "-500 kWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, -1234.56, "kWh"),
      "-1.23 MWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, -0.001234, "kWh"),
      "-1.23 Wh"
    );
  });
  it("Conversion with target unit", () => {
    assert.strictEqual(
      formatConsumptionShort(hass, 0.00012, "kWh", "Wh"),
      "0.12 Wh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 0.00012, "kWh", "kWh"),
      "0 kWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 0.01012, "kWh", "kWh"),
      "0.01 kWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 0.00012, "kWh", "MWh"),
      "0 MWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 10.12345, "kWh", "kWh"),
      "10.1 kWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 10.12345, "kWh", "ZZZZZWh"),
      "10.1 kWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 151234.5678, "kWh", "MWh"),
      "151 MWh"
    );
  });
  it("Power Short Format", () => {
    assert.strictEqual(formatPowerShort(hass, 0), "0 W");
    assert.strictEqual(formatPowerShort(hass, 10), "10 W");
    assert.strictEqual(formatPowerShort(hass, 12.2), "12 W");
    assert.strictEqual(formatPowerShort(hass, 999), "999 W");
    assert.strictEqual(formatPowerShort(hass, 1000), "1 kW");
    assert.strictEqual(formatPowerShort(hass, 1234), "1.234 kW");
    assert.strictEqual(formatPowerShort(hass, 10_500), "10.5 kW");
    assert.strictEqual(formatPowerShort(hass, 1_500_000), "1.5 MW");
    assert.strictEqual(formatPowerShort(hass, -1500), "-1.5 kW");
  });
});

describe("Energy Usage Calculation Tests", () => {
  it("Consuming Energy From the Grid", () => {
    [0, 5, 1000].forEach((x) => {
      assert.deepEqual(
        checkConsumptionResult({
          from_grid: x,
          to_grid: undefined,
          solar: undefined,
          to_battery: undefined,
          from_battery: undefined,
        }),
        {
          grid_to_battery: 0,
          battery_to_grid: 0,
          used_solar: 0,
          used_grid: x,
          used_battery: 0,
          used_total: x,
          solar_to_battery: 0,
          solar_to_grid: 0,
        }
      );
    });
  });
  it("Solar production, consuming some and returning the remainder to grid.", () => {
    (
      [
        [2.99, false], // unsolveable : solar < to_grid
        [3, true],
        [10, true],
        [100, true],
      ] as any
    ).forEach(([s, exact]) => {
      assert.deepEqual(
        checkConsumptionResult(
          {
            from_grid: 0,
            to_grid: 3,
            solar: s,
            to_battery: undefined,
            from_battery: undefined,
          },
          exact
        ),
        {
          grid_to_battery: 0,
          battery_to_grid: 0,
          used_solar: Math.min(s, Math.max(0, s - 3)),
          used_grid: 0,
          used_battery: 0,
          used_total: s - 3,
          solar_to_battery: 0,
          solar_to_grid: Math.min(3, s),
        }
      );
    });
  });
  it("Solar production with simultaneous grid consumption. Excess solar returned to the grid.", () => {
    (
      [
        [0, 0, true],
        [3, 0, true],
        [0, 3, true],
        [5, 4, true],
        [4, 5, true],
        [10, 3, true],
        [3, 7, true],
        [3, 7.1, false], // unsolveable: to_grid > solar
      ] as any
    ).forEach(([from_grid, to_grid, exact]) => {
      assert.deepEqual(
        checkConsumptionResult(
          {
            from_grid,
            to_grid,
            solar: 7,
            to_battery: undefined,
            from_battery: undefined,
          },
          exact
        ),
        {
          grid_to_battery: 0,
          battery_to_grid: 0,
          used_solar: Math.max(0, 7 - to_grid),
          used_grid: from_grid - Math.max(0, to_grid - 7),
          used_total: from_grid - to_grid + 7,
          used_battery: 0,
          solar_to_battery: 0,
          solar_to_grid: Math.min(7, to_grid),
        }
      );
    });
  });
  it("Charging the battery from the grid", () => {
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 5,
        to_grid: 0,
        solar: 0,
        to_battery: 3,
        from_battery: 0,
      }),
      {
        grid_to_battery: 3,
        battery_to_grid: 0,
        used_solar: 0,
        used_grid: 2,
        used_battery: 0,
        used_total: 2,
        solar_to_battery: 0,
        solar_to_grid: 0,
      }
    );
  });
  it("Consuming from the grid and battery simultaneously", () => {
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 5,
        to_grid: 0,
        solar: 0,
        to_battery: 0,
        from_battery: 5,
      }),
      {
        grid_to_battery: 0,
        battery_to_grid: 0,
        used_solar: 0,
        used_grid: 5,
        used_battery: 5,
        used_total: 10,
        solar_to_battery: 0,
        solar_to_grid: 0,
      }
    );
  });
  it("Consuming some battery and returning some battery to the grid", () => {
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 0,
        to_grid: 4,
        solar: 0,
        to_battery: 0,
        from_battery: 5,
      }),
      {
        grid_to_battery: 0,
        battery_to_grid: 4,
        used_solar: 0,
        used_grid: 0,
        used_battery: 1,
        used_total: 1,
        solar_to_battery: 0,
        solar_to_grid: 0,
      }
    );
  });
  it("Charging and discharging the battery to/from the grid in the same interval.", () => {
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 5,
        to_grid: 1,
        solar: 0,
        to_battery: 3,
        from_battery: 1,
      }),
      {
        grid_to_battery: 3,
        battery_to_grid: 1,
        used_solar: 0,
        used_grid: 2,
        used_battery: 0,
        used_total: 2,
        solar_to_battery: 0,
        solar_to_grid: 0,
      }
    );
  });

  it("Charging the battery with no solar sensor.", () => {
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 5,
        to_grid: 0,
        solar: undefined,
        to_battery: 3,
        from_battery: 0,
      }),
      {
        grid_to_battery: 3,
        battery_to_grid: 0,
        used_solar: 0,
        used_grid: 2,
        used_battery: 0,
        used_total: 2,
        solar_to_battery: 0,
        solar_to_grid: 0,
      }
    );
  });
  it("Discharging battery to grid while also consuming from grid.", () => {
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 5,
        to_grid: 4,
        solar: 0,
        to_battery: 0,
        from_battery: 4,
      }),
      {
        grid_to_battery: 0,
        battery_to_grid: 4,
        used_solar: 0,
        used_grid: 5,
        used_battery: 0,
        used_total: 5,
        solar_to_grid: 0,
        solar_to_battery: 0,
      }
    );
  });

  it("Grid, solar, and battery", () => {
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 5,
        to_grid: 3,
        solar: 7,
        to_battery: 3,
        from_battery: 0,
      }),
      {
        grid_to_battery: 0,
        battery_to_grid: 0,
        used_solar: 1,
        used_grid: 5,
        used_battery: 0,
        used_total: 6,
        solar_to_battery: 3,
        solar_to_grid: 3,
      }
    );
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 5,
        to_grid: 3,
        solar: 7,
        to_battery: 3,
        from_battery: 10,
      }),
      {
        grid_to_battery: 0,
        battery_to_grid: 0,
        used_solar: 1,
        used_grid: 5,
        used_battery: 10,
        used_total: 16,
        solar_to_battery: 3,
        solar_to_grid: 3,
      }
    );
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 2,
        to_grid: 7,
        solar: 7,
        to_battery: 1,
        from_battery: 1,
      }),
      {
        grid_to_battery: 0,
        battery_to_grid: 1,
        used_solar: 0,
        used_grid: 2,
        used_battery: 0,
        used_total: 2,
        solar_to_battery: 1,
        solar_to_grid: 6,
      }
    );
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 2,
        to_grid: 7,
        solar: 9,
        to_battery: 1,
        from_battery: 1,
      }),
      {
        grid_to_battery: 0,
        battery_to_grid: 0,
        used_solar: 1,
        used_grid: 2,
        used_battery: 1,
        used_total: 4,
        solar_to_battery: 1,
        solar_to_grid: 7,
      }
    );
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 5,
        to_grid: 3,
        solar: 1,
        to_battery: 0,
        from_battery: 2,
      }),
      {
        grid_to_battery: 0,
        battery_to_grid: 2,
        used_solar: 0,
        used_grid: 5,
        used_battery: 0,
        used_total: 5,
        solar_to_battery: 0,
        solar_to_grid: 1,
      }
    );
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 6,
        to_grid: 0,
        solar: 3,
        to_battery: 6,
        from_battery: 6,
      }),
      {
        grid_to_battery: 3,
        battery_to_grid: 0,
        used_solar: 0,
        used_grid: 3,
        used_battery: 6,
        solar_to_battery: 3,
        solar_to_grid: 0,
        used_total: 9,
      }
    );
  });
  it("Solar -> Battery -> Grid", () => {
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 0,
        to_grid: 1,
        solar: 1,
        to_battery: 1,
        from_battery: 1,
      }),
      {
        grid_to_battery: 0,
        battery_to_grid: 1,
        used_solar: 0,
        used_grid: 0,
        used_battery: 0,
        solar_to_battery: 1,
        solar_to_grid: 0,
        used_total: 0,
      }
    );
  });
  it("Solar -> Grid && Grid -> Battery", () => {
    assert.deepEqual(
      checkConsumptionResult({
        from_grid: 1,
        to_grid: 1,
        solar: 1,
        to_battery: 1,
        from_battery: 0,
      }),
      {
        grid_to_battery: 1,
        battery_to_grid: 0,
        used_solar: 0,
        used_grid: 0,
        used_battery: 0,
        solar_to_battery: 0,
        solar_to_grid: 1,
        used_total: 0,
      }
    );
  });

  it("bug #25387", () => {
    assert.deepEqual(
      checkConsumptionResult(
        {
          from_grid: 0.059,
          to_grid: 48.0259,
          solar: 61.22,
          to_battery: 5.716,
          from_battery: 4.83,
        },
        false
      ),
      {
        grid_to_battery: 0,
        battery_to_grid: 0,
        used_solar: 7.478099999999998,
        used_grid: 0.05899999999999572,
        used_battery: 4.83,
        solar_to_battery: 5.716,
        solar_to_grid: 48.0259,
        used_total: 12.367099999999994,
      }
    );
  });
});

describe("EV categorization", () => {
  const base = {
    from_grid: 10,
    to_grid: 0,
    solar: 0,
    to_battery: 0,
    from_battery: 0,
  };

  it("leaves everything untouched when no EV is configured", () => {
    const result = computeConsumptionSingle(base);
    assert.equal(result.used_ev, 0);
    assert.equal(result.used_home, result.used_total);
    assert.equal(result.used_grid, 10);
    assert.equal(result.ev_grid, 0);
  });

  it("deducts the EV from home without changing the total", () => {
    const result = computeConsumptionSingle({ ...base, ev: 4 });
    assert.equal(result.used_total, 10);
    assert.equal(result.used_ev, 4);
    assert.equal(result.used_home, 6);
    // Grid was the only source, so the whole EV draw is attributed to it.
    assert.equal(result.used_grid, 6);
    assert.equal(result.ev_grid, 4);
  });

  it("splits the EV across sources in proportion to the mix", () => {
    // 12 consumed: 6 solar, 2 battery, 4 grid. EV takes half of it.
    const result = computeConsumptionSingle({
      from_grid: 4,
      to_grid: 0,
      solar: 6,
      to_battery: 0,
      from_battery: 2,
      ev: 6,
    });
    assert.equal(result.used_total, 12);
    assert.equal(result.used_ev, 6);
    assert.equal(result.used_home, 6);
    assert.equal(result.ev_solar, 3);
    assert.equal(result.ev_battery, 1);
    assert.equal(result.ev_grid, 2);
    assert.equal(result.used_solar, 3);
    assert.equal(result.used_battery, 1);
    assert.equal(result.used_grid, 2);
  });

  it("clamps an EV reading larger than total consumption", () => {
    const result = computeConsumptionSingle({ ...base, ev: 25 });
    assert.equal(result.used_ev, 10);
    assert.equal(result.used_home, 0);
    assert.equal(result.used_grid, 0);
    assert.equal(result.ev_grid, 10);
  });

  it("picks up an ev energy source end to end", () => {
    const withEv = generateEnergyData(11, {
      days: 1,
      prefs: generateEnergyPreferences({ grid: true, solar: true, ev: true }),
    });
    const { summedData } = getSummedData(withEv);
    // The ev source must be summed into its own bucket.
    assert.isAbove(summedData.total.ev!, 0);

    const { consumption } = computeConsumptionData(summedData, undefined);
    assert.isAbove(consumption.total.used_ev, 0);
    assert.approximately(
      consumption.total.used_home + consumption.total.used_ev,
      consumption.total.used_total,
      1e-9
    );

    // Same data without the ev source: home takes the whole total back.
    const withoutEv = generateEnergyData(11, {
      days: 1,
      prefs: generateEnergyPreferences({ grid: true, solar: true }),
    });
    const { consumption: plain } = computeConsumptionData(
      getSummedData(withoutEv).summedData,
      undefined
    );
    assert.equal(plain.total.used_ev, 0);
    assert.equal(plain.total.used_home, plain.total.used_total);
    assert.isBelow(consumption.total.used_home, plain.total.used_home);
  });

  it("keeps the invariant when the interval is a net export", () => {
    const result = computeConsumptionSingle({
      from_grid: 0,
      to_grid: 5,
      solar: 8,
      to_battery: 0,
      from_battery: 0,
      ev: 2,
    });
    // Net consumption is 3; used_ev never exceeds it.
    assert.equal(result.used_total, 3);
    assert.equal(result.used_ev, 2);
    assert.equal(result.used_home, 1);
    assert.equal(result.used_home + result.used_ev, result.used_total);
  });
});

describe("Self-consumed solar gauge tests", () => {
  it("no battery", () => {
    const hasBattery = false;
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        total: {},
        timestamps: [0],
      }),
      undefined
    );
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        solar: {
          "0": 0,
        },
        total: {
          solar: 0,
        },
        timestamps: [0],
      }),
      undefined
    );
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        solar: {
          "0": 1,
          "1": 3,
        },
        total: {
          solar: 4,
        },
        timestamps: [0, 1],
      }),
      100
    );
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        solar: {
          "0": 1,
          "1": 3,
        },
        to_grid: {
          "1": 1,
        },
        total: {
          solar: 4,
          to_grid: 1,
        },
        timestamps: [0, 1],
      }),
      75
    );
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        solar: {
          "0": 1,
          "1": 3,
        },
        to_grid: {
          "0": 1,
          "1": 3,
        },
        total: {
          solar: 4,
          to_grid: 4,
        },
        timestamps: [0, 1],
      }),
      0
    );
  });
  it("with battery", () => {
    const hasBattery = true;
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        total: {},
        timestamps: [0],
      }),
      undefined
    );
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        solar: {
          "0": 0,
        },
        total: {
          solar: 0,
        },
        timestamps: [0],
      }),
      undefined
    );
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        solar: {
          "0": 1,
          "1": 3,
        },
        total: {
          solar: 4,
        },
        timestamps: [0, 1],
      }),
      100
    );
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        solar: {
          "0": 1,
          "1": 3,
        },
        to_grid: {
          "1": 1,
        },
        total: {
          solar: 4,
        },
        timestamps: [0, 1],
      }),
      75
    );
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        solar: {
          "10": 1,
        },
        to_grid: {
          "0": 1,
          "1": 1,
          "2": 1,
          "3": 1,
        },
        from_battery: {
          "0": 1,
          "1": 1,
          "2": 1,
          "3": 1,
        },
        total: {
          solar: 1,
        },
        timestamps: [0, 1, 2, 3, 10],
      }),
      // As the battery is discharged from unknown source, it does not affect solar production number.
      100
    );
    assert.deepEqual(
      calculateSolarConsumedGauge(hasBattery, {
        solar: {
          "0": 10,
        },
        to_battery: {
          "0": 10,
        },
        to_grid: {
          "1": 3,
          "3": 1,
        },
        from_battery: {
          "1": 3,
          "2": 2,
          "3": 2,
          "4": 3,
          "5": 100, // Unknown source, not counted
        },
        total: {
          solar: 10,
        },
        timestamps: [0, 1, 2, 3, 4, 5],
      }),
      // As the battery is discharged from unknown source, it does not affect solar production number.
      60
    );
  });
  it("complex battery/solar/grid", () => {
    const hasBattery = true;

    const value = calculateSolarConsumedGauge(hasBattery, {
      solar: {
        "1": 6,
        "2": 0,
        "3": 7,
      },
      to_battery: {
        "1": 5,
        "2": 5,
        "3": 7,
      },
      to_grid: {
        "0": 5,
        "10": 1,
        "11": 1,
        "12": 5,
        "13": 3,
      },
      from_grid: {
        "2": 5,
      },
      from_battery: {
        "0": 5,
        "10": 3,
        "11": 4,
        "12": 5,
        "13": 5,
      },
      total: {
        // Total is mostly don't care when hasBattery, only hourly values are used
        solar: 13,
      },
      timestamps: [0, 1, 2, 3, 10, 11, 12, 13],
    });
    // "1"  - consumed 1 solar, 5 sent to battery
    // "10" - consumed 2/3 of solar energy stored in battery
    // "11" - consumed 3/4 of solar energy stored in battery
    // "12" - skipped as this is energy from grid, not counted
    // "13" - consumed 2/5 of solar energy stored in battery
    const expectedNumerator = 1 + 2 + 3 + 0 + 2; // 8
    const expectedDenominator = 1 + 3 + 4 + 0 + 5; // 13
    assert.equal(
      Math.round(value!),
      Math.round((expectedNumerator / expectedDenominator) * 100)
    );
  });

  it("complex battery/solar/grid #2", () => {
    const hasBattery = true;
    const value = calculateSolarConsumedGauge(hasBattery, {
      solar: {
        "0": 100,
        "2": 100,
      },
      to_battery: {
        "0": 100,
        "1": 100,
        "2": 100,
      },
      to_grid: {
        "10": 50,
      },
      from_grid: {
        "1": 100,
      },
      from_battery: {
        "10": 300,
      },
      total: {
        solar: 200,
        to_battery: 300,
        to_grid: 50,
        from_grid: 100,
        from_battery: 300,
      },
      timestamps: [0, 1, 2, 10],
    });
    const expectedNumerator = 200 - 50;
    const expectedDenominator = 200; // ignoring 100 from grid
    assert.equal(
      Math.round(value!),
      Math.round((expectedNumerator / expectedDenominator) * 100)
    );
  });
});

describe("getNextEnergyPeriodStart", () => {
  const locale: FrontendLocaleData = {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
    date_format: DateFormat.language,
    time_zone: TimeZone.server,
    first_weekday: FirstWeekday.language,
  };
  // Pin the time zone (via TimeZone.server) so the test does not depend on the
  // machine's local zone.
  const config = { time_zone: "America/New_York" } as HassConfig;

  const isMidnight = (date: Date) =>
    calcDate(date, startOfDay, locale, config).getTime() === date.getTime();

  it("rolls the real-time view over at midnight, statistics an hour later", () => {
    const now = new Date("2026-06-19T15:30:00-04:00");

    const realTime = getNextEnergyPeriodStart(true, now, locale, config);
    const statistics = getNextEnergyPeriodStart(false, now, locale, config);

    // Real-time rolls over exactly at the next midnight.
    assert.isTrue(isMidnight(realTime));
    assert.equal(
      realTime.getTime(),
      new Date("2026-06-20T00:00:00-04:00").getTime()
    );

    // Statistics roll over an hour after midnight, on the same day boundary.
    assert.equal(statistics.getTime() - realTime.getTime(), 60 * 60 * 1000 - 1);
    assert.equal(
      calcDate(statistics, startOfDay, locale, config).getTime(),
      realTime.getTime()
    );
  });

  it("advances the real-time view to the next midnight when called after midnight", () => {
    const now = new Date("2026-06-20T00:30:00-04:00");

    const realTime = getNextEnergyPeriodStart(true, now, locale, config);

    assert.isTrue(isMidnight(realTime));
    // Next midnight is June 21, not the already-passed June 20 midnight.
    assert.equal(
      realTime.getTime(),
      new Date("2026-06-21T00:00:00-04:00").getTime()
    );
  });
});

describe("getEnergyDefaultPeriodStorageKey", () => {
  it("uses an explicit collection key", () => {
    assert.equal(
      getEnergyDefaultPeriodStorageKey(
        { panelUrl: "energy" } as HomeAssistant,
        "energy_dashboard"
      ),
      "energy-default-period-_energy_dashboard"
    );
  });

  it("scopes to the panel when no collection key is given", () => {
    assert.equal(
      getEnergyDefaultPeriodStorageKey({
        panelUrl: "my-dashboard",
      } as HomeAssistant),
      "energy-default-period-_energy_my-dashboard"
    );
  });

  it("falls back to the global key without a panel url", () => {
    assert.equal(
      getEnergyDefaultPeriodStorageKey({} as HomeAssistant),
      "energy-default-period-_energy"
    );
  });

  it("rejects a collection key with the wrong prefix", () => {
    assert.throws(() =>
      getEnergyDefaultPeriodStorageKey({} as HomeAssistant, "dashboard")
    );
  });
});

describe("computeEnergyLabel", () => {
  const ENTITY_ID = "sensor.washer_energy";

  const createEntry = (
    entry: Partial<EntityRegistryDisplayEntry>
  ): EntityRegistryDisplayEntry =>
    ({
      entity_id: ENTITY_ID,
      labels: [],
      ...entry,
    }) as EntityRegistryDisplayEntry;

  const createDevice = (
    device: Partial<DeviceRegistryEntry>
  ): DeviceRegistryEntry =>
    ({ id: "device1", name_by_user: null, ...device }) as DeviceRegistryEntry;

  const createHass = (
    friendlyName: string,
    entry?: Partial<EntityRegistryDisplayEntry>,
    device?: Partial<DeviceRegistryEntry>
  ) =>
    createMockHass(
      {
        [ENTITY_ID]: createMockEntityState(ENTITY_ID, "1", {
          friendly_name: friendlyName,
        }),
      },
      {
        entities: entry ? { [ENTITY_ID]: createEntry(entry) } : {},
        devices: device ? { device1: createDevice(device) } : {},
      }
    );

  it("composes the device and entity name", () => {
    const hass = createHass(
      "Washer Energy",
      { name: "Energy", device_id: "device1" },
      { name: "Washer" }
    );

    assert.equal(computeEnergyLabel(hass, ENTITY_ID), "Washer Energy");
  });

  it("uses the device name alone when the entity has no name of its own", () => {
    const hass = createHass(
      "Washer",
      { name: "Washer", device_id: "device1" },
      { name: "Washer" }
    );

    assert.equal(computeEnergyLabel(hass, ENTITY_ID), "Washer");
  });

  it("distinguishes entities sharing a name by their device", () => {
    const hass = createHass(
      "Energy",
      { name: "Energy", device_id: "device1" },
      { name: "Dishwasher" }
    );

    assert.equal(computeEnergyLabel(hass, ENTITY_ID), "Dishwasher Energy");
  });

  it("keeps a name set by the user", () => {
    const hass = createHass(
      "Washer Energy",
      { name: "Energy", device_id: "device1" },
      { name: "Washer" }
    );

    assert.equal(
      computeEnergyLabel(hass, ENTITY_ID, undefined, "Laundry"),
      "Laundry"
    );
  });

  it("ignores an empty name", () => {
    const hass = createHass(
      "Washer Energy",
      { name: "Energy", device_id: "device1" },
      { name: "Washer" }
    );

    assert.equal(
      computeEnergyLabel(hass, ENTITY_ID, undefined, ""),
      "Washer Energy"
    );
  });

  it("falls back to the friendly name for an entity outside the registry", () => {
    const hass = createHass("Washer Energy");

    assert.equal(computeEnergyLabel(hass, ENTITY_ID), "Washer Energy");
  });

  it("uses the statistic metadata name when there is no entity", () => {
    const hass = createMockHass();

    assert.equal(
      computeEnergyLabel(hass, "external:solar", {
        statistic_id: "external:solar",
        name: "Solar production",
      } as StatisticsMetaData),
      "Solar production"
    );
  });

  it("falls back to the statistic id when there is nothing to name it with", () => {
    const hass = createMockHass();

    assert.equal(computeEnergyLabel(hass, "external:solar"), "external:solar");
  });
});

describe("computeEnergyDeviceLabels", () => {
  const DEVICES = [
    {
      stat_consumption: "sensor.washer_energy",
      stat_rate: "sensor.washer_power",
    },
    { stat_consumption: "sensor.heater_energy", name: "Heater" },
  ];

  const hass = createMockHass({
    "sensor.washer_energy": createMockEntityState("sensor.washer_energy", "1", {
      friendly_name: "Washer Energy",
    }),
    "sensor.washer_power": createMockEntityState("sensor.washer_power", "5", {
      friendly_name: "Washer Power",
    }),
  });

  it("keys labels by the consumption statistic", () => {
    assert.deepEqual(computeEnergyDeviceLabels(hass, DEVICES), {
      "sensor.washer_energy": "Washer Energy",
      "sensor.heater_energy": "Heater",
    });
  });

  it("keys labels by the rate statistic, skipping devices without one", () => {
    assert.deepEqual(
      computeEnergyDeviceLabels(hass, DEVICES, undefined, "stat_rate"),
      { "sensor.washer_power": "Washer Power" }
    );
  });
});
