import "@formatjs/intl-durationformat/polyfill-force";
import { assert, describe, it } from "vitest";
import { formatDuration } from "../../../src/common/datetime/format_duration";
import type { FrontendLocaleData } from "../../../src/data/translation";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../../src/data/translation";

const LOCALE: FrontendLocaleData = {
  language: "en",
  number_format: NumberFormat.language,
  time_format: TimeFormat.am_pm,
  date_format: DateFormat.language,
  time_zone: TimeZone.local,
  first_weekday: FirstWeekday.language,
};

describe("formatDuration", () => {
  it("works", () => {
    assert.strictEqual(formatDuration(LOCALE, "0.25", "min"), "0m 15s");
    assert.strictEqual(formatDuration(LOCALE, "0.5", "min"), "0m 30s");
    assert.strictEqual(formatDuration(LOCALE, "1", "min"), "1m");
    assert.strictEqual(formatDuration(LOCALE, "20", "min"), "20m");
    assert.strictEqual(formatDuration(LOCALE, "95.5", "min"), "95m 30s");

    assert.strictEqual(formatDuration(LOCALE, "0.25", "h"), "0h 15m");
    assert.strictEqual(formatDuration(LOCALE, "0.5", "h"), "0h 30m");
    assert.strictEqual(formatDuration(LOCALE, "1", "h"), "1h");
    assert.strictEqual(formatDuration(LOCALE, "20", "h"), "20h");
    assert.strictEqual(formatDuration(LOCALE, "95.5", "h"), "95h 30m");

    assert.strictEqual(formatDuration(LOCALE, "0", "d"), "0d");
    assert.strictEqual(formatDuration(LOCALE, "0.4", "d"), "0d 9h");
    assert.strictEqual(formatDuration(LOCALE, "1", "d"), "1d");
    assert.strictEqual(formatDuration(LOCALE, "20", "d"), "20d");
    assert.strictEqual(formatDuration(LOCALE, "95.5", "d"), "95d 12h");
    assert.strictEqual(formatDuration(LOCALE, "95.75", "d", 0), "96d");
    assert.strictEqual(formatDuration(LOCALE, "95.75", "d", 2), "95d 18h");
  });
});
