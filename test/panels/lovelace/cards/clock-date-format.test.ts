import { assert, describe, it } from "vitest";
import type { ClockCardDatePart } from "../../../../src/panels/lovelace/cards/types";
import {
  formatClockCardDate,
  getClockCardDateConfig,
  getClockCardDateTimeFormatOptions,
  hasClockCardDate,
} from "../../../../src/panels/lovelace/cards/clock/clock-date-format";

describe("clock-date-format", () => {
  it("returns an empty config when date format is missing", () => {
    assert.deepEqual(getClockCardDateConfig(), { parts: [] });
  });

  it("keeps one variant per date group and last variant wins", () => {
    const config = getClockCardDateConfig({
      date_format: [
        "day-numeric",
        "month-short",
        "separator-dash",
        "day-2-digit",
        "month-long",
        "separator-dot",
        "year-2-digit",
        "year-numeric",
      ],
    });

    assert.deepEqual(config.parts, [
      "day-2-digit",
      "month-long",
      "separator-dot",
      "year-numeric",
    ]);
  });

  it("filters invalid date tokens", () => {
    const config = getClockCardDateConfig({
      date_format: [
        "month-short",
        "invalid",
        "year-2-digit",
      ] as unknown as ClockCardDatePart[],
    });

    assert.deepEqual(config.parts, ["month-short", "year-2-digit"]);
  });

  it("builds Intl options from selected date tokens", () => {
    const options = getClockCardDateTimeFormatOptions({
      parts: [
        "weekday-short",
        "separator-slash",
        "day-2-digit",
        "month-numeric",
        "year-2-digit",
      ],
    });

    assert.deepEqual(options, {
      weekday: "short",
      day: "2-digit",
      month: "numeric",
      year: "2-digit",
    });
  });

  it("reports whether any date part is configured", () => {
    assert.equal(hasClockCardDate(), false);
    assert.equal(hasClockCardDate({ date_format: [] }), false);
    assert.equal(hasClockCardDate({ date_format: ["separator-dot"] }), false);
    assert.equal(hasClockCardDate({ date_format: ["weekday-short"] }), true);
  });

  it("formats output in configured part order with separator", () => {
    const dateTimeParts: Intl.DateTimeFormatPart[] = [
      { type: "weekday", value: "Sat" },
      { type: "day", value: "08" },
      { type: "month", value: "11" },
      { type: "year", value: "24" },
    ];

    const result = formatClockCardDate(dateTimeParts, {
      parts: [
        "month-numeric",
        "separator-slash",
        "day-2-digit",
        "year-2-digit",
      ],
    });

    assert.equal(result, "11/08/24");
  });
});
