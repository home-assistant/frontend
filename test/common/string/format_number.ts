import { assert } from "chai";

import { formatNumber } from "../../../src/common/number/format_number";
import {
  FrontendLocaleData,
  NumberFormat,
  TimeFormat,
} from "../../../src/data/translation";

describe("formatNumber", () => {
  // Create default to not have to specify a not relevant TimeFormat over and over again.
  const defaultLocale: FrontendLocaleData = {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
  };

  // Node only ships with English support for `Intl`, so we can not test for other number formats here.
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
});
