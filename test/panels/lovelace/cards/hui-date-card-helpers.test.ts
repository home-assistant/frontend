import { describe, expect, it, vi } from "vitest";
import {
  DATE_CARD_FORMATTERS,
  DEFAULT_DATE_FORMAT,
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
import type { DateCardConfig } from "../../../../src/panels/lovelace/cards/types";

const locale = {
  language: "en",
  number_format: NumberFormat.language,
  time_format: TimeFormat.language,
  date_format: DateFormat.language,
  time_zone: TimeZone.local,
  first_weekday: FirstWeekday.language,
};

const dateObj = new Date(2017, 10, 18, 11, 12, 13, 1400);

describe("DEFAULT_DATE_FORMAT", () => {
  it("defaults to weekday_day", () => {
    expect(DEFAULT_DATE_FORMAT).toBe("weekday_day");
  });
});

describe("DATE_CARD_FORMATTERS", () => {
  it("has an entry for every supported date_format value", () => {
    const expectedKeys: NonNullable<DateCardConfig["date_format"]>[] = [
      "weekday_day",
      "long",
      "short",
      "numeric",
      "very_short",
      "weekday_very_short_date",
      "weekday_short_date",
    ];
    expect(Object.keys(DATE_CARD_FORMATTERS).sort()).toEqual(
      [...expectedKeys].sort()
    );
  });
});

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
  it("formats using the weekday_day formatter by default", () => {
    expect(computeDateText(dateObj, locale, demoConfig, { type: "date" })).toBe(
      "Saturday, November 18"
    );
  });

  it("formats using the long formatter", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: "long",
      })
    ).toBe("November 18, 2017");
  });

  it("formats using the short formatter", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: "short",
      })
    ).toBe("Nov 18, 2017");
  });

  it("formats using the numeric formatter", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: "numeric",
      })
    ).toBe("11/18/2017");
  });

  it("formats using the very_short formatter", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: "very_short",
      })
    ).toBe("Nov 18");
  });

  it("formats using the weekday_very_short_date formatter", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: "weekday_very_short_date",
      })
    ).toBe("Sat, Nov 18");
  });

  it("formats using the weekday_short_date formatter", () => {
    expect(
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: "weekday_short_date",
      })
    ).toBe("Sat, Nov 18, 2017");
  });

  it("respects a card-level time_zone override", () => {
    // demoConfig.time_zone is "America/Los_Angeles"; forcing a zone far enough
    // east flips the calendar day for this UTC instant.
    const utcDateObj = new Date(Date.UTC(2017, 10, 18, 4, 0, 0));
    expect(
      computeDateText(utcDateObj, locale, demoConfig, {
        type: "date",
        date_format: "long",
        time_zone: "Pacific/Auckland",
      })
    ).toBe("November 18, 2017");
    expect(
      computeDateText(utcDateObj, locale, demoConfig, {
        type: "date",
        date_format: "long",
        time_zone: "Etc/GMT+12",
      })
    ).toBe("November 17, 2017");
  });

  it("falls back to the default formatter for an unknown/invalid date_format", () => {
    const invalidConfig = {
      type: "date",
      date_format: "not_a_real_format",
    } as unknown as DateCardConfig;

    expect(() =>
      computeDateText(dateObj, locale, demoConfig, invalidConfig)
    ).not.toThrow();
    expect(computeDateText(dateObj, locale, demoConfig, invalidConfig)).toBe(
      computeDateText(dateObj, locale, demoConfig, { type: "date" })
    );
  });

  it("reuses the memoized Intl.DateTimeFormat across repeated calls without a time_zone override", () => {
    const realDateTimeFormat = Intl.DateTimeFormat;
    // vitest requires a `function` (not an arrow function) here to mock a
    // constructor invoked with `new`.
    // eslint-disable-next-line prefer-arrow-callback
    const spy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (
      ...args: ConstructorParameters<typeof Intl.DateTimeFormat>
    ) {
      return new realDateTimeFormat(...args);
    });
    try {
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: "long",
      });
      const callsAfterFirst = spy.mock.calls.length;
      computeDateText(dateObj, locale, demoConfig, {
        type: "date",
        date_format: "long",
      });
      expect(spy.mock.calls.length).toBe(callsAfterFirst);
    } finally {
      spy.mockRestore();
    }
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
