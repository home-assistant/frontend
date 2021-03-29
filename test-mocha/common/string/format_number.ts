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
