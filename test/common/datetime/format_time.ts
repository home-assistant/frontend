import { assert } from "chai";

import {
  formatTime,
  formatTimeWithSeconds,
  formatTimeWeekday,
} from "../../../src/common/datetime/format_time";
import {
  NumberFormat,
  TimeFormat,
  FirstWeekday,
} from "../../../src/data/translation";

describe("formatTime", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 1400);

  it("Formats English times", () => {
    assert.strictEqual(
      formatTime(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.am_pm,
        first_weekday: FirstWeekday.language,
      }),
      "11:12 PM"
    );
    assert.strictEqual(
      formatTime(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.twenty_four,
        first_weekday: FirstWeekday.language,
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
        first_weekday: FirstWeekday.language,
      }),
      "11:12:13 PM"
    );
    assert.strictEqual(
      formatTimeWithSeconds(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.twenty_four,
        first_weekday: FirstWeekday.language,
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
        first_weekday: FirstWeekday.language,
      }),
      "Wednesday 11:12 PM"
    );
    assert.strictEqual(
      formatTimeWeekday(dateObj, {
        language: "en",
        number_format: NumberFormat.language,
        time_format: TimeFormat.twenty_four,
        first_weekday: FirstWeekday.language,
      }),
      "Wednesday 23:12"
    );
  });
});
