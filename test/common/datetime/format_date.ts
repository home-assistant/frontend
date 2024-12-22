import { assert } from "chai";

import { formatDate } from "../../../src/common/datetime/format_date";
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

  it("Formats English dates", () => {
    assert.strictEqual(
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
      ),
      "November 18, 2017"
    );
  });
});
