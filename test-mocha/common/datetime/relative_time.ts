import { assert } from "chai";

import { relativeTime } from "../../../src/common/datetime/relative_time";
import { NumberFormat, TimeFormat } from "../../../src/data/translation";

describe("relativeTime", () => {
  const locale = {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
  };

  it("now", () => {
    const now = new Date();
    assert.strictEqual(relativeTime(now, locale, now), "now");
    assert.strictEqual(relativeTime(now, locale, now, false), "0 seconds");
  });

  it("past_second", () => {
    const inputdt = new Date("2021-02-03T11:22:00+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, locale, compare),
      "33 seconds ago"
    );
    assert.strictEqual(
      relativeTime(inputdt, locale, compare, false),
      "33 seconds"
    );
  });

  it("past_minute", () => {
    const inputdt = new Date("2021-02-03T11:20:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(relativeTime(inputdt, locale, compare), "2 minutes ago");
    assert.strictEqual(
      relativeTime(inputdt, locale, compare, false),
      "2 minutes"
    );
  });

  it("past_hour", () => {
    const inputdt = new Date("2021-02-03T09:22:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(relativeTime(inputdt, locale, compare), "2 hours ago");
    assert.strictEqual(
      relativeTime(inputdt, locale, compare, false),
      "2 hours"
    );
  });

  it("past_day", () => {
    const inputdt = new Date("2021-02-01T11:22:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(relativeTime(inputdt, locale, compare), "2 days ago");
    assert.strictEqual(relativeTime(inputdt, locale, compare, false), "2 days");
  });

  it("future_second", () => {
    const inputdt = new Date("2021-02-03T11:22:55+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(relativeTime(inputdt, locale, compare), "in 22 seconds");
    assert.strictEqual(
      relativeTime(inputdt, locale, compare, false),
      "22 seconds"
    );
  });

  it("future_minute", () => {
    const inputdt = new Date("2021-02-03T11:24:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(relativeTime(inputdt, locale, compare), "in 2 minutes");
    assert.strictEqual(
      relativeTime(inputdt, locale, compare, false),
      "2 minutes"
    );
  });

  it("future_hour", () => {
    const inputdt = new Date("2021-02-03T13:22:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(relativeTime(inputdt, locale, compare), "in 2 hours");
    assert.strictEqual(
      relativeTime(inputdt, locale, compare, false),
      "2 hours"
    );
  });

  it("future_day", () => {
    const inputdt = new Date("2021-02-05T11:22:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(relativeTime(inputdt, locale, compare), "in 2 days");
    assert.strictEqual(relativeTime(inputdt, locale, compare, false), "2 days");
  });

  it("future_week", () => {
    const inputdt = new Date("2021-03-24T11:22:33+00:00");
    const compare = new Date("2021-03-03T11:22:33+00:00");
    assert.strictEqual(relativeTime(inputdt, locale, compare), "in 3 weeks");
    assert.strictEqual(
      relativeTime(inputdt, locale, compare, false),
      "3 weeks"
    );
  });

  it("future_month", () => {
    const inputdt = new Date("2021-03-03T11:22:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(relativeTime(inputdt, locale, compare), "next month");
    assert.strictEqual(
      relativeTime(inputdt, locale, compare, false),
      "1 month"
    );
  });
});
