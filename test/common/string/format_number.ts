import { assert } from "chai";
import { HassEntity } from "home-assistant-js-websocket";

import {
  formatNumber,
  getDefaultFormatOptions,
  getNumberFormatOptions,
} from "../../../src/common/number/format_number";
import {
  FrontendLocaleData,
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../../src/data/translation";

describe("formatNumber", () => {
  // Create default to not have to specify a not relevant TimeFormat over and over again.
  const defaultLocale: FrontendLocaleData = {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
    date_format: DateFormat.language,
    time_zone: TimeZone.local,
    first_weekday: FirstWeekday.language,
  };

  // Node only ships with English support for `Intl`, so we cannot test for other number formats here.
  it("Formats English numbers", () => {
    assert.strictEqual(formatNumber(1234.5, defaultLocale), "1,234.5");
  });

  it("Test format 'none' (keep dot despite language 'de')", () => {
    assert.strictEqual(
      formatNumber(1.23, {
        ...defaultLocale,
        language: "de",
        number_format: NumberFormat.none,
      }),
      "1.23"
    );
  });

  it("Ensure zero is kept for format 'language'", () => {
    assert.strictEqual(formatNumber(0, defaultLocale), "0");
  });

  it("Ensure zero is kept for format 'none'", () => {
    assert.strictEqual(
      formatNumber(0, { ...defaultLocale, number_format: NumberFormat.none }),
      "0"
    );
  });

  it("Test empty string input for format 'none'", () => {
    assert.strictEqual(
      formatNumber("", { ...defaultLocale, number_format: NumberFormat.none }),
      ""
    );
  });

  it("Test empty string input for format 'language'", () => {
    assert.strictEqual(formatNumber("", defaultLocale), "0");
  });

  it("Formats number with options", () => {
    assert.strictEqual(
      formatNumber(1234.5, defaultLocale, {
        minimumFractionDigits: 2,
      }),
      "1,234.50"
    );
  });

  it("Formats number with fraction digits options if number format is none", () => {
    assert.strictEqual(
      formatNumber(
        1234.5,
        { ...defaultLocale, number_format: NumberFormat.none },
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      ),
      "1234.50"
    );
  });

  it("Do not formats number with others options if number format is none", () => {
    assert.strictEqual(
      formatNumber(
        1234.5,
        { ...defaultLocale, number_format: NumberFormat.none },
        {
          useGrouping: true,
        }
      ),
      "1234.5"
    );
  });

  it("Sets only the maximumFractionDigits format option when none are provided for a number value", () => {
    assert.deepEqual(getDefaultFormatOptions(1234.5), {
      maximumFractionDigits: 2,
    });
  });

  it("Sets minimumFractionDigits and maximumFractionDigits to '2' when none are provided for a string numeric value with two decimal places", () => {
    assert.deepEqual(getDefaultFormatOptions("1234.50"), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  });

  it("Merges default format options (minimumFractionDigits and maximumFractionDigits) and non-default format options for a string numeric value with two decimal places", () => {
    assert.deepEqual(getDefaultFormatOptions("1234.50", { currency: "USD" }), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currency: "USD",
    });
  });

  it("Sets maximumFractionDigits when that is the only format option provided", () => {
    assert.deepEqual(
      getDefaultFormatOptions("1234.50", { maximumFractionDigits: 0 }),
      {
        maximumFractionDigits: 0,
      }
    );
  });

  it("Sets maximumFractionDigits to '2' and minimumFractionDigits to the provided value when only minimumFractionDigits is provided", () => {
    assert.deepEqual(
      getDefaultFormatOptions("1234.50", { minimumFractionDigits: 1 }),
      {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }
    );
  });

  it("Sets maximumFractionDigits to '0' when the state value and step are integers", () => {
    assert.deepEqual(
      getNumberFormatOptions({
        state: "3.0",
        attributes: { step: 1 },
      } as unknown as HassEntity),
      {
        maximumFractionDigits: 0,
      }
    );
  });

  it("Does not set any Intl.NumberFormatOptions when the step is not an integer", () => {
    assert.strictEqual(
      getNumberFormatOptions({
        state: "3.0",
        attributes: { step: 0.5 },
      } as unknown as HassEntity)
    );
  });

  it("Does not set any Intl.NumberFormatOptions when the state value is not an integer", () => {
    assert.strictEqual(
      getNumberFormatOptions({ state: "3.5" } as unknown as HassEntity),
      undefined
    );
  });

  it("Does not set any Intl.NumberFormatOptions when there is no step attribute", () => {
    assert.strictEqual(
      getNumberFormatOptions({ state: "3.0" } as unknown as HassEntity),
      undefined
    );
  });
});
