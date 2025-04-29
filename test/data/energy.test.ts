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
} from "../../src/data/energy";
import type { HomeAssistant } from "../../src/types";

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
  it("Formats", () => {
    assert.strictEqual(formatConsumptionShort(hass, 0, "kWh"), "0 kWh");
    assert.strictEqual(formatConsumptionShort(hass, 0, "GWh"), "0 GWh");
    assert.strictEqual(formatConsumptionShort(hass, 0, "gal"), "0 gal");

    assert.strictEqual(
      formatConsumptionShort(hass, 0.12345, "kWh"),
      "0.12 kWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 10.12345, "kWh"),
      "10.1 kWh"
    );
    assert.strictEqual(
      formatConsumptionShort(hass, 500.12345, "kWh"),
      "500 kWh"
    );
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

    assert.strictEqual(formatConsumptionShort(hass, 1000.1, "GWh"), "1 TWh");

    assert.strictEqual(
      formatConsumptionShort(hass, 10000.12345, "gal"),
      "10,000 gal"
    );

    // Don't really modify negative numbers, but make sure it's something sane.
    assert.strictEqual(
      formatConsumptionShort(hass, -1234.56, "kWh"),
      "-1,234.56 kWh"
    );
  });
});

describe("Energy Usage Calculation Tests", () => {
  it("Consuming Energy From the Grid", () => {
    [0, 5, 1000].forEach((x) => {
      assert.deepEqual(
        computeConsumptionSingle({
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
        }
      );
    });
  });
  it("Solar production, consuming some and returning the remainder to grid.", () => {
    [2.99, 3, 10, 100].forEach((s) => {
      assert.deepEqual(
        computeConsumptionSingle({
          from_grid: 0,
          to_grid: 3,
          solar: s,
          to_battery: undefined,
          from_battery: undefined,
        }),
        {
          grid_to_battery: 0,
          battery_to_grid: 0,
          used_solar: Math.max(0, s - 3),
          used_grid: 0,
          used_battery: 0,
        }
      );
    });
  });
  it("Solar production with simultaneous grid consumption. Excess solar returned to the grid.", () => {
    [
      [0, 0],
      [3, 0],
      [0, 3],
      [5, 4],
      [4, 5],
      [10, 3],
      [3, 7],
      [3, 7.1],
    ].forEach(([from_grid, to_grid]) => {
      assert.deepEqual(
        computeConsumptionSingle({
          from_grid,
          to_grid,
          solar: 7,
          to_battery: undefined,
          from_battery: undefined,
        }),
        {
          grid_to_battery: 0,
          battery_to_grid: 0,
          used_solar: Math.max(0, 7 - to_grid),
          used_grid: from_grid,
          used_battery: 0,
        }
      );
    });
  });
  it("Charging the battery from the grid", () => {
    assert.deepEqual(
      computeConsumptionSingle({
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
      }
    );
  });
  it("Consuming from the grid and battery simultaneously", () => {
    assert.deepEqual(
      computeConsumptionSingle({
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
      }
    );
  });
  it("Consuming some battery and returning some battery to the grid", () => {
    assert.deepEqual(
      computeConsumptionSingle({
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
      }
    );
  });
  /* Fails
  it("Charging and discharging the battery to/from the grid in the same interval.", () => {
    assert.deepEqual(
      computeConsumptionSingle({
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
        used_grid: 1,
        used_battery: 0,
      }
    );
  }); */
  /* Test does not pass, battery is not really correct when solar is not present
  it("Charging the battery with no solar sensor.", () => {
    assert.deepEqual(
      computeConsumptionSingle({
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
      }
    );
  }); */
  /* Test does not pass
  it("Discharging battery to grid while also consuming from grid.", () => {
    assert.deepEqual(
      computeConsumptionSingle({
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
      }
    );
  });
    */

  it("Grid, solar, and battery", () => {
    assert.deepEqual(
      computeConsumptionSingle({
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
      }
    );
    assert.deepEqual(
      computeConsumptionSingle({
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
      }
    );
    assert.deepEqual(
      computeConsumptionSingle({
        from_grid: 2,
        to_grid: 7,
        solar: 7,
        to_battery: 1,
        from_battery: 1,
      }),
      {
        grid_to_battery: 1,
        battery_to_grid: 0,
        used_solar: 0,
        used_grid: 1,
        used_battery: 1,
      }
    );
    assert.deepEqual(
      computeConsumptionSingle({
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
      }
    );
    /* Test does not pass
    assert.deepEqual(
      computeConsumptionSingle({
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
      }
    );
    */
  });
});
