import "@formatjs/intl-durationformat/polyfill-force";
import { expect, describe, it } from "vitest";
import {
  formatDuration,
  formatDurationLong,
  formatDurationDigital,
  formatNumericDuration,
} from "../../../src/common/datetime/format_duration";
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
    expect(formatDuration(LOCALE, "0.25", "min")).toBe("0m 15s");
    expect(formatDuration(LOCALE, "0.5", "min")).toBe("0m 30s");
    expect(formatDuration(LOCALE, "1", "min")).toBe("1m");
    expect(formatDuration(LOCALE, "20", "min")).toBe("20m");
    expect(formatDuration(LOCALE, "95.5", "min")).toBe("95m 30s");

    expect(formatDuration(LOCALE, "0.25", "h")).toBe("0h 15m");
    expect(formatDuration(LOCALE, "0.5", "h")).toBe("0h 30m");
    expect(formatDuration(LOCALE, "1", "h")).toBe("1h");
    expect(formatDuration(LOCALE, "20", "h")).toBe("20h");
    expect(formatDuration(LOCALE, "95.5", "h")).toBe("95h 30m");

    expect(formatDuration(LOCALE, "0", "d")).toBe("0d");
    expect(formatDuration(LOCALE, "0.4", "d")).toBe("0d 9h");
    expect(formatDuration(LOCALE, "1", "d")).toBe("1d");
    expect(formatDuration(LOCALE, "20", "d")).toBe("20d");
    expect(formatDuration(LOCALE, "95.5", "d")).toBe("95d 12h");
    expect(formatDuration(LOCALE, "95.75", "d", 0)).toBe("96d");
    expect(formatDuration(LOCALE, "95.75", "d", 2)).toBe("95d 18h");
  });

  it("throws error for invalid duration unit", () => {
    expect(() => formatDuration(LOCALE, "1", "invalid_unit" as any)).toThrow(
      "Invalid duration unit"
    );
  });
});

describe("formatDurationLong", () => {
  it("formats long duration", () => {
    const duration = { days: 1, hours: 2, minutes: 3, seconds: 4 };
    expect(formatDurationLong(LOCALE, duration)).toBe(
      "1 day, 2 hours, 3 minutes, 4 seconds"
    );
  });
});

describe("formatDurationDigital", () => {
  it("formats digital duration", () => {
    const duration = { hours: 1, minutes: 2, seconds: 3 };
    expect(formatDurationDigital(LOCALE, duration)).toBe("1:02:03");
  });
});

describe("formatNumericDuration", () => {
  it("formats numeric duration", () => {
    const duration = { days: 1, hours: 2, minutes: 3, seconds: 4 };
    expect(formatNumericDuration(LOCALE, duration)).toBe("1 day 2:03:04");
  });

  it("formats duration with only days", () => {
    const duration = { days: 1 };
    expect(formatNumericDuration(LOCALE, duration)).toBe("1 day 0:00:00");
  });

  it("formats duration with only hours", () => {
    const duration = { hours: 1 };
    expect(formatNumericDuration(LOCALE, duration)).toBe("1:00:00");
  });

  it("formats duration with only minutes", () => {
    const duration = { minutes: 1 };
    expect(formatNumericDuration(LOCALE, duration)).toBe("1:00");
  });

  it("formats duration with only seconds", () => {
    const duration = { seconds: 1 };
    expect(formatNumericDuration(LOCALE, duration)).toBe("1 second");
  });

  it("formats duration with only milliseconds", () => {
    const duration = { milliseconds: 1 };
    expect(formatNumericDuration(LOCALE, duration)).toBe("1 millisecond");
  });

  it("should not format duration with 0", () => {
    const duration = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    };
    expect(formatNumericDuration(LOCALE, duration)).toBe(null);
  });
});
