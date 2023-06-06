import { assert } from "chai";

import { relativeTime } from "../../../src/common/datetime/relative_time";
import {
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../../src/data/translation";

describe("relativeTime", () => {
  const locale = {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
    date_format: DateFormat.language,
    time_zone: TimeZone.local,
    first_weekday: FirstWeekday.language,
  };

  const locale_monday = {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
    date_format: DateFormat.language,
    time_zone: TimeZone.local,
    first_weekday: FirstWeekday.monday,
  };

  describe("no time difference", () => {
    const now = new Date();
    it("returns now with tense", () => {
      assert.strictEqual(relativeTime(now, locale, now), "now");
    });
    it("returns 0 seconds without tense", () => {
      assert.strictEqual(relativeTime(now, locale, now, false), "0 seconds");
    });
  });

  describe("33 second difference", () => {
    const date1 = new Date("2021-02-03T11:22:00+00:00");
    const date2 = new Date("2021-02-03T11:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "33 seconds ago");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "in 33 seconds");
    });

    it("without tense", () => {
      assert.strictEqual(
        relativeTime(date1, locale, date2, false),
        "33 seconds"
      );

      assert.strictEqual(
        relativeTime(date2, locale, date1, false),
        "33 seconds"
      );
    });
  });

  describe("2 minute difference", () => {
    const date1 = new Date("2021-02-03T11:20:33+00:00");
    const date2 = new Date("2021-02-03T11:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "2 minutes ago");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "in 2 minutes");
    });

    it("without tense", () => {
      assert.strictEqual(
        relativeTime(date1, locale, date2, false),
        "2 minutes"
      );

      assert.strictEqual(
        relativeTime(date2, locale, date1, false),
        "2 minutes"
      );
    });
  });

  describe("2 hour difference", () => {
    const date1 = new Date("2021-02-03T09:22:33+00:00");
    const date2 = new Date("2021-02-03T11:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "2 hours ago");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "in 2 hours");
    });

    it("without tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2, false), "2 hours");

      assert.strictEqual(relativeTime(date2, locale, date1, false), "2 hours");
    });
  });

  describe("23 hour difference during the same day", () => {
    const date1 = new Date("2021-02-01T00:22:33+00:00");
    const date2 = new Date("2021-02-01T23:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "23 hours ago");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "in 23 hours");
    });

    it("without tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2, false), "23 hours");

      assert.strictEqual(relativeTime(date2, locale, date1, false), "23 hours");
    });
  });

  describe("23 hour difference during different days", () => {
    const date1 = new Date("2021-02-01T11:22:33+00:00");
    const date2 = new Date("2021-02-02T10:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "yesterday");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "tomorrow");
    });

    it("without tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2, false), "1 day");

      assert.strictEqual(relativeTime(date2, locale, date1, false), "1 day");
    });
  });

  describe("33 hour difference during three days", () => {
    const date1 = new Date("2021-02-01T21:22:33+00:00");
    const date2 = new Date("2021-02-03T06:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "2 days ago");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "in 2 days");
    });

    it("without tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2, false), "2 days");

      assert.strictEqual(relativeTime(date2, locale, date1, false), "2 days");
    });
  });

  describe("5 day difference Sunday to Friday", () => {
    const date1 = new Date("2021-01-31T20:22:33+00:00");
    const date2 = new Date("2021-02-05T21:22:33+00:00");

    describe("with Sunday as first day of the week", () => {
      it("past tense", () => {
        assert.strictEqual(relativeTime(date1, locale, date2), "5 days ago");
      });

      it("future tense", () => {
        assert.strictEqual(relativeTime(date2, locale, date1), "in 5 days");
      });

      it("without tense", () => {
        assert.strictEqual(relativeTime(date1, locale, date2, false), "5 days");

        assert.strictEqual(relativeTime(date2, locale, date1, false), "5 days");
      });
    });

    describe("with Monday as first day of the week", () => {
      it("past tense", () => {
        assert.strictEqual(
          relativeTime(date1, locale_monday, date2),
          "last week"
        );
      });

      it("future tense", () => {
        assert.strictEqual(
          relativeTime(date2, locale_monday, date1),
          "next week"
        );
      });

      it("without tense", () => {
        assert.strictEqual(
          relativeTime(date1, locale_monday, date2, false),
          "1 week"
        );

        assert.strictEqual(
          relativeTime(date2, locale_monday, date1, false),
          "1 week"
        );
      });
    });
  });

  describe("5 day difference Tuesday to Sunday", () => {
    const date1 = new Date("2021-02-02T20:22:33+00:00");
    const date2 = new Date("2021-02-07T21:22:33+00:00");

    describe("with Sunday as first day of the week", () => {
      it("past tense", () => {
        assert.strictEqual(relativeTime(date1, locale, date2), "last week");
      });

      it("future tense", () => {
        assert.strictEqual(relativeTime(date2, locale, date1), "next week");
      });

      it("without tense", () => {
        assert.strictEqual(relativeTime(date1, locale, date2, false), "1 week");

        assert.strictEqual(relativeTime(date2, locale, date1, false), "1 week");
      });
    });

    describe("with Monday as first day of the week", () => {
      it("past tense", () => {
        assert.strictEqual(
          relativeTime(date1, locale_monday, date2),
          "5 days ago"
        );
      });

      it("future tense", () => {
        assert.strictEqual(
          relativeTime(date2, locale_monday, date1),
          "in 5 days"
        );
      });

      it("without tense", () => {
        assert.strictEqual(
          relativeTime(date1, locale_monday, date2, false),
          "5 days"
        );

        assert.strictEqual(
          relativeTime(date2, locale_monday, date1, false),
          "5 days"
        );
      });
    });
  });

  describe("11 day difference during three weeks", () => {
    const date1 = new Date("2021-02-05T20:22:33+00:00");
    const date2 = new Date("2021-02-16T21:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "2 weeks ago");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "in 2 weeks");
    });

    it("without tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2, false), "2 weeks");

      assert.strictEqual(relativeTime(date2, locale, date1, false), "2 weeks");
    });
  });

  describe("30 day difference during the same month", () => {
    const date1 = new Date("2021-03-01T20:22:33+00:00");
    const date2 = new Date("2021-03-31T21:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "4 weeks ago");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "in 4 weeks");
    });

    it("without tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2, false), "4 weeks");

      assert.strictEqual(relativeTime(date2, locale, date1, false), "4 weeks");
    });
  });

  describe("30 day difference during different months", () => {
    const date1 = new Date("2021-02-05T20:22:33+00:00");
    const date2 = new Date("2021-03-07T21:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "last month");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "next month");
    });

    it("without tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2, false), "1 month");

      assert.strictEqual(relativeTime(date2, locale, date1, false), "1 month");
    });
  });

  describe("11 month difference during same year", () => {
    const date1 = new Date("2021-01-05T20:22:33+00:00");
    const date2 = new Date("2021-12-05T21:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "11 months ago");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "in 11 months");
    });

    it("without tense", () => {
      assert.strictEqual(
        relativeTime(date1, locale, date2, false),
        "11 months"
      );

      assert.strictEqual(
        relativeTime(date2, locale, date1, false),
        "11 months"
      );
    });
  });

  describe("11 month difference during different years", () => {
    const date1 = new Date("2021-02-05T20:22:33+00:00");
    const date2 = new Date("2022-01-05T21:22:33+00:00");

    it("past tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2), "last year");
    });

    it("future tense", () => {
      assert.strictEqual(relativeTime(date2, locale, date1), "next year");
    });

    it("without tense", () => {
      assert.strictEqual(relativeTime(date1, locale, date2, false), "1 year");

      assert.strictEqual(relativeTime(date2, locale, date1, false), "1 year");
    });
  });
});
