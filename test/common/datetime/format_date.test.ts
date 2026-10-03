import { describe, expect, it } from "vitest";
import {
  formatCallyMonthYear,
  formatDate,
  formatDateWeekdayDay,
  formatDateShort,
  formatDateNumeric,
  formatDateVeryShort,
  formatDateMonthYear,
  formatDateMonth,
  formatDateYear,
  formatDateWeekday,
  formatDateWeekdayShort,
} from "../../../src/common/datetime/format_date";
import {
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../../src/data/translation";
import { demoConfig } from "../../../src/fake_data/demo_config";

describe("formatDate", () => {
  const dateObj = new Date(2017, 10, 18, 11, 12, 13, 1400);

  describe("formatDate", () => {
    it("Formats English dates", () => {
      expect(
        formatDate(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("November 18, 2017");
    });
  });

  describe("formatDateWeekdayDay", () => {
    it("Formats weekday and day", () => {
      expect(
        formatDateWeekdayDay(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("Saturday, November 18");
    });
  });

  describe("formatDateShort", () => {
    it("Formats short date", () => {
      expect(
        formatDateShort(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("Nov 18, 2017");
    });
  });

  describe("formatDateNumeric", () => {
    it("Formats numeric date", () => {
      expect(
        formatDateNumeric(
          dateObj,
          {
            language: "de",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("18.11.2017");
    });

    it("Formats numeric date in DMY format", () => {
      expect(
        formatDateNumeric(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.DMY,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("18/11/2017");
    });

    it("Formats numeric date in MDY format", () => {
      expect(
        formatDateNumeric(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.MDY,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("11/18/2017");
    });

    it("Formats numeric date in YMD format", () => {
      expect(
        formatDateNumeric(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.YMD,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("2017/11/18");
    });
  });

  describe("formatDateVeryShort", () => {
    it("Formats very short date", () => {
      expect(
        formatDateVeryShort(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("Nov 18");
    });
  });

  describe("formatDateMonthYear", () => {
    it("Formats month and year", () => {
      expect(
        formatDateMonthYear(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("November 2017");
    });
  });

  describe("formatDateMonth", () => {
    it("Formats month", () => {
      expect(
        formatDateMonth(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("November");
    });
  });

  describe("formatDateYear", () => {
    it("Formats year", () => {
      expect(
        formatDateYear(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("2017");
    });
  });

  describe("formatDateWeekday", () => {
    it("Formats weekday", () => {
      expect(
        formatDateWeekday(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("Saturday");
    });
  });

  describe("formatDateWeekdayShort", () => {
    it("Formats short weekday", () => {
      expect(
        formatDateWeekdayShort(
          dateObj,
          {
            language: "en",
            number_format: NumberFormat.language,
            time_format: TimeFormat.language,
            date_format: DateFormat.language,
            time_zone: TimeZone.local,
            first_weekday: FirstWeekday.language,
          },
          demoConfig
        )
      ).toBe("Sat");
    });
  });

  describe("formatCallyMonthYear", () => {
    // How cally hands out a calendar day: a Date anchored to UTC midnight
    const julyFirst = new Date(Date.UTC(2026, 6, 1));
    const januaryFirst = new Date(Date.UTC(2026, 0, 1));

    // demoConfig.time_zone is America/Los_Angeles, so this resolves to a
    // negative UTC offset whatever zone the tests run in
    const locale = {
      language: "en",
      number_format: NumberFormat.language,
      time_format: TimeFormat.language,
      date_format: DateFormat.language,
      time_zone: TimeZone.server,
      first_weekday: FirstWeekday.language,
    };

    it("Formats in UTC rather than the resolved time zone", () => {
      // A time zone aware formatter reads UTC midnight on the 1st as the
      // previous month, which desyncs the header from the calendar grid
      expect(formatDateMonthYear(julyFirst, locale, demoConfig)).toBe(
        "June 2026"
      );
      expect(formatCallyMonthYear(julyFirst, locale)).toBe("July 2026");
    });

    it("Keeps the year on a January page", () => {
      expect(formatDateMonthYear(januaryFirst, locale, demoConfig)).toBe(
        "December 2025"
      );
      expect(formatCallyMonthYear(januaryFirst, locale)).toBe("January 2026");
    });

    it("Orders month and year by locale", () => {
      expect(
        formatCallyMonthYear(julyFirst, { ...locale, language: "ja" })
      ).toBe("2026年7月");
    });
  });
});
