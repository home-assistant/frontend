import { assert, describe, it } from "vitest";

import {
  type FrontendLocaleData,
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../src/data/translation";
import { formatConsumptionShort } from "../../src/data/energy";
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
