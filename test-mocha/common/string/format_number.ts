import { assert } from "chai";

import { formatNumber } from "../../../src/common/string/format_number";
import { NumberFormat } from "../../../src/data/translation";

describe("formatNumber", () => {
  // Node only ships with English support for `Intl`, so we can not test for other number formats here.
  it("Formats English numbers", () => {
    assert.strictEqual(
      formatNumber(1234.5, {
        language: "en",
        number_format: NumberFormat.language,
      }),
      "1,234.5"
    );
  });

  it("Test format 'none' (keep comma despite language 'en')", () => {
    assert.strictEqual(
      formatNumber("1,23", {
        language: "en",
        number_format: NumberFormat.none,
      }),
      "1,23"
    );
  });

  it("Ensure zero is kept for format 'language'", () => {
    assert.strictEqual(
      formatNumber(0, {
        language: "en",
        number_format: NumberFormat.language,
      }),
      "0"
    );
  });

  it("Ensure zero is kept for format 'none'", () => {
    assert.strictEqual(
      formatNumber(0, {
        language: "en",
        number_format: NumberFormat.none,
      }),
      "0"
    );
  });

  it("Test empty string input for format 'none'", () => {
    assert.strictEqual(
      formatNumber("", {
        language: "en",
        number_format: NumberFormat.none,
      }),
      ""
    );
  });

  it("Test empty string input for format 'language'", () => {
    assert.strictEqual(
      formatNumber("", {
        language: "en",
        number_format: NumberFormat.language,
      }),
      "0"
    );
  });

  it("Formats number with options", () => {
    assert.strictEqual(
      formatNumber(
        1234.5,
        {
          language: "en",
          number_format: NumberFormat.language,
        },
        {
          minimumFractionDigits: 2,
        }
      ),
      "1,234.50"
    );
  });
});
