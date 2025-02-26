import { expect, describe, it } from "vitest";

import {
  formatTime,
  formatTimeWithSeconds,
  formatTimeWeekday,
  formatTime24h,
} from "../../../src/common/datetime/format_time";
import {
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../../src/data/translation";
import { demoConfig } from "../../../src/fake_data/demo_config";

describe("formatTime", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 1400);

  it("Formats English times", () => {
    expect(
      formatTime(
        dateObj,
        {
          language: "en",
          number_format: NumberFormat.language,
          time_format: TimeFormat.am_pm,
          date_format: DateFormat.language,
          time_zone: TimeZone.local,
          first_weekday: FirstWeekday.language,
        },
        demoConfig
      )
    ).toBe("11:12 PM");
    expect(
      formatTime(
        dateObj,
        {
          language: "en",
          number_format: NumberFormat.language,
          time_format: TimeFormat.twenty_four,
          date_format: DateFormat.language,
          time_zone: TimeZone.local,
          first_weekday: FirstWeekday.language,
        },
        demoConfig
      )
    ).toBe("23:12");
  });
});

describe("formatTimeWithSeconds", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 400);

  it("Formats English times with seconds", () => {
    expect(
      formatTimeWithSeconds(
        dateObj,
        {
          language: "en",
          number_format: NumberFormat.language,
          time_format: TimeFormat.am_pm,
          date_format: DateFormat.language,
          time_zone: TimeZone.local,
          first_weekday: FirstWeekday.language,
        },
        demoConfig
      )
    ).toBe("11:12:13 PM");
    expect(
      formatTimeWithSeconds(
        dateObj,
        {
          language: "en",
          number_format: NumberFormat.language,
          time_format: TimeFormat.twenty_four,
          date_format: DateFormat.language,
          time_zone: TimeZone.local,
          first_weekday: FirstWeekday.language,
        },
        demoConfig
      )
    ).toBe("23:12:13");
  });
});

describe("formatTimeWeekday", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 1400);

  it("Formats English times", () => {
    expect(
      formatTimeWeekday(
        dateObj,
        {
          language: "en",
          number_format: NumberFormat.language,
          time_format: TimeFormat.am_pm,
          date_format: DateFormat.language,
          time_zone: TimeZone.local,
          first_weekday: FirstWeekday.language,
        },
        demoConfig
      )
    ).toBe("Saturday 11:12 PM");
    expect(
      formatTimeWeekday(
        dateObj,
        {
          language: "en",
          number_format: NumberFormat.language,
          time_format: TimeFormat.twenty_four,
          date_format: DateFormat.language,
          time_zone: TimeZone.local,
          first_weekday: FirstWeekday.language,
        },
        demoConfig
      )
    ).toBe("Saturday 23:12");
  });
});

describe("formatTime24h", () => {
  const dateObj = new Date(2017, 10, 18, 23, 12, 13, 1400);

  it("Formats English times in 24h format", () => {
    expect(
      formatTime24h(
        dateObj,
        {
          language: "en",
          number_format: NumberFormat.language,
          time_format: TimeFormat.twenty_four,
          date_format: DateFormat.language,
          time_zone: TimeZone.local,
          first_weekday: FirstWeekday.language,
        },
        demoConfig
      )
    ).toBe("23:12");
  });
});
