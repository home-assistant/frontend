import { describe, expect, it } from "vitest";

import {
  formatFrequency,
  formatFrequencyRange,
  formatFrequencyRanges,
} from "../../src/data/radio_frequency";
import {
  DateFormat,
  FirstWeekday,
  type FrontendLocaleData,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../src/data/translation";

const locale: FrontendLocaleData = {
  language: "en",
  number_format: NumberFormat.language,
  time_format: TimeFormat.language,
  date_format: DateFormat.language,
  time_zone: TimeZone.local,
  first_weekday: FirstWeekday.language,
};

describe("formatFrequency", () => {
  it("picks the largest unit that keeps the value >= 1", () => {
    expect(formatFrequency(50, locale)).toBe("50 Hz");
    expect(formatFrequency(2400, locale)).toBe("2.4 kHz");
    expect(formatFrequency(433_920_000, locale)).toBe("433.92 MHz");
    expect(formatFrequency(2_400_000_000, locale)).toBe("2.4 GHz");
  });

  it("rounds to at most three fractional digits", () => {
    expect(formatFrequency(868_300_000, locale)).toBe("868.3 MHz");
    expect(formatFrequency(123_456_789, locale)).toBe("123.457 MHz");
  });
});

describe("formatFrequencyRange", () => {
  it("collapses a range to a single value when min equals max", () => {
    expect(formatFrequencyRange([433_920_000, 433_920_000], locale)).toBe(
      "433.92 MHz"
    );
  });

  it("formats a range with both bounds", () => {
    expect(formatFrequencyRange([863_000_000, 870_000_000], locale)).toBe(
      "863 MHz – 870 MHz"
    );
  });
});

describe("formatFrequencyRanges", () => {
  it("joins multiple ranges with commas", () => {
    expect(
      formatFrequencyRanges(
        [
          [433_920_000, 433_920_000],
          [868_000_000, 870_000_000],
        ],
        locale
      )
    ).toBe("433.92 MHz, 868 MHz – 870 MHz");
  });

  it("returns an empty string for no ranges", () => {
    expect(formatFrequencyRanges([], locale)).toBe("");
  });
});
