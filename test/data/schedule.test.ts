import { assert, describe, it } from "vitest";

import type { ScheduleWeek } from "../../src/data/schedule";
import {
  applyScheduleBlock,
  copyScheduleDay,
  formatScheduleTime,
  getConflictingDays,
  getFreeRange,
  getNewBlockRange,
  getScheduleWeek,
  moveRange,
  isScheduleBlockData,
  localeWeekdays,
  normalizeScheduleTime,
  resizeRange,
  timeToMinutes,
} from "../../src/data/schedule";
import { FirstWeekday, TimeFormat } from "../../src/data/translation";
import { mockLocale } from "../fixtures/hass";

const blocks = [
  { from: "06:00", to: "08:00" },
  { from: "17:00", to: "22:00" },
];

const week = (partial: Partial<ScheduleWeek>): ScheduleWeek =>
  getScheduleWeek(partial);

describe("schedule times", () => {
  it("reads backend times with seconds and the end of the day", () => {
    assert.equal(timeToMinutes("07:30:00"), 450);
    assert.equal(timeToMinutes("24:00:00"), 1440);
  });

  it("treats a midnight end time as the end of the day", () => {
    assert.equal(normalizeScheduleTime("00:00:00", true), "24:00");
    assert.equal(normalizeScheduleTime("00:00:00"), "00:00");
    // `schedule.get_schedule` returns the end of the day as `time.max`.
    assert.equal(normalizeScheduleTime("23:59:59.999999", true), "24:00");
  });

  it("keeps seconds, so saving other changes does not move a block", () => {
    assert.equal(normalizeScheduleTime("08:00:30"), "08:00:30");
    assert.equal(normalizeScheduleTime("08:00:00"), "08:00");
    assert.equal(timeToMinutes("08:00:30"), 480.5);
  });

  it("keeps 24:00 in 24-hour format", () => {
    const locale = { ...mockLocale, time_format: TimeFormat.twenty_four };
    assert.equal(formatScheduleTime(1440, locale), "24:00");
    assert.equal(
      formatScheduleTime(795, { ...locale, time_format: TimeFormat.am_pm }),
      "1:15 PM"
    );
  });
});

describe("getScheduleWeek", () => {
  it("fills missing days, normalizes, and sorts blocks", () => {
    const result = getScheduleWeek({
      monday: [
        { from: "17:00:00", to: "00:00:00" },
        { from: "06:00:00", to: "08:00:00", data: { mode: "eco" } },
      ],
    });
    assert.deepEqual(result.monday, [
      { from: "06:00", to: "08:00", data: { mode: "eco" } },
      { from: "17:00", to: "24:00" },
    ]);
    assert.deepEqual(result.sunday, []);
  });
});

describe("localeWeekdays", () => {
  it("starts on the first weekday", () => {
    const days = localeWeekdays({
      ...mockLocale,
      first_weekday: FirstWeekday.monday,
    });
    assert.deepEqual(days.slice(0, 2), ["monday", "tuesday"]);
    assert.equal(days[6], "sunday");
  });
});

describe("isScheduleBlockData", () => {
  it("accepts text, numbers, and booleans like the backend", () => {
    assert.isTrue(isScheduleBlockData({ mode: "eco", level: 2, on: true }));
  });

  it("rejects nested values, lists, and null", () => {
    assert.isFalse(isScheduleBlockData({ mode: { nested: true } }));
    assert.isFalse(isScheduleBlockData({ modes: ["eco"] }));
    assert.isFalse(isScheduleBlockData(["eco"]));
    assert.isFalse(isScheduleBlockData(null));
  });

  it("rejects numbers that JSON turns into null", () => {
    assert.isFalse(isScheduleBlockData({ level: Infinity }));
    assert.isFalse(isScheduleBlockData({ level: NaN }));
  });
});

describe("getFreeRange", () => {
  it("returns the gap between neighbors", () => {
    assert.deepEqual(getFreeRange(blocks, 600), { start: 480, end: 1020 });
  });

  it("returns nothing inside a block unless that block is ignored", () => {
    assert.isUndefined(getFreeRange(blocks, 420));
    assert.deepEqual(getFreeRange(blocks, 420, 0), { start: 0, end: 1020 });
  });
});

describe("getNewBlockRange", () => {
  it("creates an hour from the snapped click time", () => {
    assert.deepEqual(getNewBlockRange(blocks, 610), { start: 600, end: 660 });
  });

  it("fits a block into a gap shorter than an hour after the click", () => {
    assert.deepEqual(getNewBlockRange(blocks, 1000), { start: 960, end: 1020 });
  });

  it("creates nothing when clicking a block", () => {
    assert.isUndefined(getNewBlockRange(blocks, 400));
  });
});

describe("moveRange and resizeRange", () => {
  const bounds = { start: 480, end: 1020 };

  it("stops at the neighbors when moving", () => {
    assert.deepEqual(moveRange({ start: 600, end: 660 }, 1000, bounds), {
      start: 960,
      end: 1020,
    });
    assert.deepEqual(moveRange({ start: 600, end: 660 }, 100, bounds), {
      start: 480,
      end: 540,
    });
  });

  it("keeps at least 15 minutes when resizing", () => {
    assert.deepEqual(
      resizeRange({ start: 600, end: 660 }, "end", 590, bounds),
      { start: 600, end: 615 }
    );
    assert.deepEqual(
      resizeRange({ start: 600, end: 660 }, "start", 700, bounds),
      { start: 645, end: 660 }
    );
  });
});

describe("applyScheduleBlock", () => {
  it("moves an edited block to the selected days", () => {
    const source = week({ monday: [{ from: "06:00", to: "08:00" }] });
    const result = applyScheduleBlock(
      source,
      { from: "07:00", to: "09:00" },
      ["tuesday", "wednesday"],
      { day: "monday", index: 0 }
    );
    assert.deepEqual(result.monday, []);
    assert.deepEqual(result.tuesday, [{ from: "07:00", to: "09:00" }]);
    assert.deepEqual(result.wednesday, [{ from: "07:00", to: "09:00" }]);
    assert.deepEqual(source.monday, [{ from: "06:00", to: "08:00" }]);
  });

  it("reports overlaps on other days but not with the edited block", () => {
    const source = week({
      monday: [{ from: "06:00", to: "08:00" }],
      tuesday: [{ from: "07:30", to: "10:00" }],
    });
    assert.deepEqual(
      getConflictingDays(
        source,
        { from: "07:00", to: "09:00" },
        ["monday", "tuesday", "friday"],
        { day: "monday", index: 0 }
      ),
      ["tuesday"]
    );
  });
});

describe("copyScheduleDay", () => {
  it("replaces target days with independent copies", () => {
    const source = week({
      monday: [{ from: "06:00", to: "08:00", data: { mode: "eco" } }],
      tuesday: [{ from: "10:00", to: "11:00" }],
    });
    const result = copyScheduleDay(source, "monday", ["tuesday", "monday"]);
    assert.deepEqual(result.tuesday, source.monday);
    assert.notStrictEqual(result.tuesday[0].data, source.monday[0].data);
    assert.strictEqual(result.monday, source.monday);
  });
});
