import { assert } from "chai";

import relativeTime from "../../../src/common/datetime/relative_time";

describe("relativeTime", () => {
  // Mock localize function for testing
  const localize = (message, ...args) =>
    message + (args.length ? ": " + args.join(",") : "");

  it("now", () => {
    const now = new Date();
    assert.strictEqual(
      relativeTime(now, localize, { compareTime: now }),
      "ui.components.relative_time.just_now"
    );
  });

  it("past_second", () => {
    const inputdt = new Date("2021-02-03T11:22:00+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.past_duration.second: count,33"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.second: count,33"
    );
  });

  it("past_minute", () => {
    const inputdt = new Date("2021-02-03T11:20:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.past_duration.minute: count,2"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.minute: count,2"
    );
  });

  it("past_hour", () => {
    const inputdt = new Date("2021-02-03T09:22:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.past_duration.hour: count,2"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.hour: count,2"
    );
  });

  it("past_day", () => {
    let inputdt = new Date("2021-02-01T11:22:33+00:00");
    let compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.past_duration.day: count,2"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.day: count,2"
    );

    // Test switch from days to weeks
    inputdt = new Date("2021-01-28T11:22:33+00:00");
    compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.day: count,6"
    );
    inputdt = new Date("2021-01-27T11:22:33+00:00");
    compare = new Date("2021-02-03T11:22:33+00:00");
    assert.notStrictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.day: count,7"
    );
  });

  it("past_week", () => {
    const inputdt = new Date("2021-01-03T11:22:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.past_duration.week: count,4"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.week: count,4"
    );
  });

  it("future_second", () => {
    const inputdt = new Date("2021-02-03T11:22:55+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.future_duration.second: count,22"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.second: count,22"
    );
  });

  it("future_minute", () => {
    const inputdt = new Date("2021-02-03T11:24:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.future_duration.minute: count,2"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.minute: count,2"
    );
  });

  it("future_hour", () => {
    const inputdt = new Date("2021-02-03T13:22:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.future_duration.hour: count,2"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.hour: count,2"
    );
  });

  it("future_day", () => {
    let inputdt = new Date("2021-02-05T11:22:33+00:00");
    let compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.future_duration.day: count,2"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.day: count,2"
    );

    // Test switch from days to weeks
    inputdt = new Date("2021-02-09T11:22:33+00:00");
    compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.day: count,6"
    );
    inputdt = new Date("2021-02-10T11:22:33+00:00");
    compare = new Date("2021-02-03T11:22:33+00:00");
    assert.notStrictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.day: count,7"
    );
  });

  it("future_week", () => {
    const inputdt = new Date("2021-03-03T11:22:33+00:00");
    const compare = new Date("2021-02-03T11:22:33+00:00");
    assert.strictEqual(
      relativeTime(inputdt, localize, { compareTime: compare }),
      "ui.components.relative_time.future_duration.week: count,4"
    );
    assert.strictEqual(
      relativeTime(inputdt, localize, {
        compareTime: compare,
        includeTense: false,
      }),
      "ui.components.relative_time.duration.week: count,4"
    );
  });
});
