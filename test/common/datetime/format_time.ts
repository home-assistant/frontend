import { assert } from "chai";

import {
  formatTime,
  formatTimeWithSeconds,
  formatTimeWeekday,
} from "../../../src/common/datetime/format_time";
import { NumberFormat, TimeFormat } from "../../../src/data/translation";

describe("formatTime", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 1400);

  it("Formats English times", () => {
    assert.strictEqual(
      formatTime(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.am_pm,
      }),
      "11:12 PM"
    );
    assert.strictEqual(
      formatTime(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.twenty_four,
      }),
      "23:12"
    );
  });
});

describe("formatTimeWithSeconds", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 400);

  it("Formats English times with seconds", () => {
    assert.strictEqual(
      formatTimeWithSeconds(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.am_pm,
      }),
      "11:12:13 PM"
    );
    assert.strictEqual(
      formatTimeWithSeconds(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.twenty_four,
      }),
      "23:12:13"
    );
  });
});

describe("formatTimeWeekday", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 1400);

  it("Formats English times", () => {
    assert.strictEqual(
      formatTimeWeekday(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.am_pm,
      }),
      "Wednesday 11:12 PM"
    );
    assert.strictEqual(
      formatTimeWeekday(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.twenty_four,
      }),
      "Wednesday 23:12"
    );
  });
});
