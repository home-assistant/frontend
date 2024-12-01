import { assert, describe, it } from "vitest";

import { formatDuration } from "../../../src/common/datetime/duration";
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
    assert.strictEqual(formatDuration("0", "ms", undefined, LOCALE), "0ms");
    assert.strictEqual(formatDuration("1", "ms", undefined, LOCALE), "1ms");
    assert.strictEqual(formatDuration("10", "ms", undefined, LOCALE), "10ms");
    assert.strictEqual(formatDuration("100", "ms", undefined, LOCALE), "100ms");
    assert.strictEqual(
      formatDuration("1000", "ms", undefined, LOCALE),
      "1,000ms"
    );
    assert.strictEqual(
      formatDuration("1001", "ms", undefined, LOCALE),
      "1,001ms"
    );
    assert.strictEqual(
      formatDuration("65000", "ms", undefined, LOCALE),
      "65,000ms"
    );

    assert.strictEqual(
      formatDuration("0.5", "s", undefined, LOCALE),
      "0s 500ms"
    );
    assert.strictEqual(formatDuration("1", "s", undefined, LOCALE), "1s");
    assert.strictEqual(
      formatDuration("1.1", "s", undefined, LOCALE),
      "1s 100ms"
    );
    assert.strictEqual(formatDuration("65", "s", undefined, LOCALE), "65s");

    assert.strictEqual(
      formatDuration("0.25", "min", undefined, LOCALE),
      "0m 15s"
    );
    assert.strictEqual(
      formatDuration("0.5", "min", undefined, LOCALE),
      "0m 30s"
    );
    assert.strictEqual(formatDuration("1", "min", undefined, LOCALE), "1m");
    assert.strictEqual(formatDuration("20", "min", undefined, LOCALE), "20m");
    assert.strictEqual(
      formatDuration("95.5", "min", undefined, LOCALE),
      "95m 30s"
    );

    assert.strictEqual(
      formatDuration("0.25", "h", undefined, LOCALE),
      "0h 15m"
    );
    assert.strictEqual(formatDuration("0.5", "h", undefined, LOCALE), "0h 30m");
    assert.strictEqual(formatDuration("1", "h", undefined, LOCALE), "1h");
    assert.strictEqual(formatDuration("20", "h", undefined, LOCALE), "20h");
    assert.strictEqual(
      formatDuration("95.5", "h", undefined, LOCALE),
      "95h 30m"
    );

    assert.strictEqual(formatDuration("0", "d", undefined, LOCALE), "0d");
    assert.strictEqual(formatDuration("0.4", "d", undefined, LOCALE), "0d 9h");
    assert.strictEqual(formatDuration("1", "d", undefined, LOCALE), "1d");
    assert.strictEqual(formatDuration("20", "d", undefined, LOCALE), "20d");
    assert.strictEqual(
      formatDuration("95.5", "d", undefined, LOCALE),
      "95d 12h"
    );
    assert.strictEqual(formatDuration("95.75", "d", 0, LOCALE), "96d");
    assert.strictEqual(formatDuration("95.75", "d", 2, LOCALE), "95d 18h");
  });
});
