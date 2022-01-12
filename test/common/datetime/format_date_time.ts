import { assert } from "chai";

import {
  formatDateTime,
  formatDateTimeWithSeconds,
} from "../../../src/common/datetime/format_date_time";
import { NumberFormat, TimeFormat } from "../../../src/data/translation";

describe("formatDateTime", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 400);

  it("Formats English date times", () => {
    assert.strictEqual(
      formatDateTime(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.am_pm,
      }),
      "November 18, 2017 at 11:12 PM"
    );
    assert.strictEqual(
      formatDateTime(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.twenty_four,
      }),
      "November 18, 2017 at 23:12"
    );
  });
});

describe("formatDateTimeWithSeconds", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 400);

  it("Formats English date times with seconds", () => {
    assert.strictEqual(
      formatDateTimeWithSeconds(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.am_pm,
      }),
      "November 18, 2017 at 11:12:13 PM"
    );
    assert.strictEqual(
      formatDateTimeWithSeconds(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.twenty_four,
      }),
      "November 18, 2017 at 23:12:13"
    );
  });
});
