import { describe, expect, it } from "vitest";
import {
  computeResolvedTimeZone,
  computeDateText,
  computeMsUntilMidnight,
} from "../../../../src/panels/lovelace/cards/hui-date-card-helpers";
import {
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../../../src/data/translation";
import { demoConfig } from "../../../../src/fake_data/demo_config";
import type { ClockCardDatePart } from "../../../../src/panels/lovelace/cards/types";

const locale = {
  language: "en",
  number_format: NumberFormat.language,
  time_format: TimeFormat.language,
  date_format: DateFormat.language,
  time_zone: TimeZone.local,
  first_weekday: FirstWeekday.language,
};

const dateObj = new Date(2017, 10, 18, 11, 12, 13, 1400);

describe("computeResolvedTimeZone", () => {
  it("uses the card's time_zone override when set", () => {
    expect(
      computeResolvedTimeZone(locale, demoConfig, {
        type: "date",
        time_zone: "Europe/Paris",
      })
    ).toBe("Europe/Paris");
  });

  it("falls back to the resolved profile/server time zone when unset", () => {
    expect(
      computeResolvedTimeZone(
        { ...locale, time_zone: TimeZone.server },
        demoConfig,
        { type: "date" }
      )
    ).toBe(demoConfig.time_zone);
  });
});

describe("computeDateText", () => {
  it("falls back to weekday-long + day-numeric + month-long when date_format is unset", () => {
    expect(computeDateText(dateObj, locale, demoConfig, { type: "date" })).toBe(
      "Saturday 18 November"
    );
  });

  it("falls back to the same default when date_format is an empty array", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: [],
      })
    ).toBe("Saturday 18 November");
  });

  it("formats using configured tokens in the given order, honoring separators", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: [
          "month-long",
          "day-numeric",
          "separator-dot",
          "year-numeric",
        ],
      })
    ).toBe("November 18.2017");
  });

  it("formats using a single token", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: ["year-numeric"],
      })
    ).toBe("2017");
  });

  it("filters out unknown/invalid tokens and falls back to the default when nothing valid remains", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: ["not_a_real_token"] as unknown as ClockCardDatePart[],
      })
    ).toBe("Saturday 18 November");
  });

  it("respects a card-level time_zone override", () => {
    // demoConfig.time_zone is "America/Los_Angeles"; forcing a zone far enough
    // east/west flips the calendar day for this UTC instant.
    const utcDateObj = new Date(Date.UTC(2017, 10, 18, 4, 0, 0));
    const dateFormat: ClockCardDatePart[] = [
      "year-numeric",
      "separator-dash",
      "month-long",
      "separator-dash",
      "day-numeric",
    ];

    expect(
      computeDateText(utcDateObj, locale, demoConfig, {
        type: "date",
        date_format: dateFormat,
        time_zone: "Pacific/Auckland",
      })
    ).toBe("2017-November-18");

    expect(
      computeDateText(utcDateObj, locale, demoConfig, {
        type: "date",
        date_format: dateFormat,
        time_zone: "Etc/GMT+12",
      })
    ).toBe("2017-November-17");
  });
});

describe("computeMsUntilMidnight", () => {
  it("computes the exact delay to the next midnight in the given time zone", () => {
    const now = new Date(Date.UTC(2017, 10, 18, 23, 59, 58));
    // In UTC, 23:59:58 is 2 seconds before midnight.
    expect(computeMsUntilMidnight(now, "UTC")).toBe(2000);
  });

  it("handles the hour24 midnight edge case (00:00:00 exactly)", () => {
    const now = new Date(Date.UTC(2017, 10, 18, 0, 0, 0));
    expect(computeMsUntilMidnight(now, "UTC")).toBe(86400000);
  });

  it("accounts for a different time zone than the machine's local zone", () => {
    // 23:00 UTC = 00:00 in Europe/Paris (UTC+1 in November) -> just past midnight there.
    const now = new Date(Date.UTC(2017, 10, 18, 23, 0, 0));
    expect(computeMsUntilMidnight(now, "Europe/Paris")).toBe(86400000);
  });

  it("accounts for a 23-hour local day on a spring-forward DST transition", () => {
    // Europe/Paris spring-forward on 2023-03-26: 02:00 CET jumps to 03:00
    // CEST, so this local day only has 23 real hours. At 01:30 CET (00:30
    // UTC), the next local midnight is 21.5 real hours away, not 22.5.
    const now = new Date(Date.UTC(2023, 2, 26, 0, 30, 0));
    expect(computeMsUntilMidnight(now, "Europe/Paris")).toBe(21.5 * 3600000);
  });
});
