import { assert } from "chai";

import {
  formatDateTime,
  formatDateTimeWithSeconds,
} from "../../../src/common/datetime/format_date_time";
import { NumberFormat } from "../../../src/data/translation";

describe("formatDateTime", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 400);

  it("Formats English date times", () => {
    assert.strictEqual(
      formatDateTime(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
      }),
      "November 18, 2017, 11:12 AM"
    );
  });
});

describe("formatDateTimeWithSeconds", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 400);

  it("Formats English date times with seconds", () => {
    assert.strictEqual(
      formatDateTimeWithSeconds(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
      }),
      "November 18, 2017, 11:12:13 AM"
    );
  });
});
