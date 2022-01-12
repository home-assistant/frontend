import { assert } from "chai";

import { formatDate } from "../../../src/common/datetime/format_date";
import { NumberFormat, TimeFormat } from "../../../src/data/translation";

describe("formatDate", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 1400);

  it("Formats English dates", () => {
    assert.strictEqual(
      formatDate(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.language,
      }),
      "November 18, 2017"
    );
  });
});
