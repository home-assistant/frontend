import { assert, describe, it } from "vitest";

import {
  type FrontendLocaleData,
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../src/data/translation";
import {
  computeConsumptionSingle,
  formatConsumptionShort,
  calculateSolarConsumedGauge,
} from "../../src/data/energy";
import type { HomeAssistant } from "../../src/types";

const checkConsumptionResult = (
  input: {
    from_grid: number | undefined;
    to_grid: number | undefined;
    solar: number | undefined;
    to_battery: number | undefined;
    from_battery: number | undefined;
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
    assert.equal(
      result.used_total,
      result.used_solar + result.used_battery + result.used_grid
    );
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
      result.solar_to_battery + result.solar_to_grid + result.used_solar
    );
  }
  return result;
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
    assert.strictEqual(formatConsumptionShort(hass, 0, "kWh"), "0 kWh");
    assert.strictEqual(formatConsumptionShort(hass, 0, "GWh"), "0 GWh");
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
