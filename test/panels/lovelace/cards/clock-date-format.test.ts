import { assert, describe, it } from "vitest";
import type { ClockCardDatePart } from "../../../../src/panels/lovelace/cards/types";
import {
  formatClockCardDate,
  getClockCardDateConfig,
  getClockCardDateTimeFormatOptions,
  hasClockCardDate,
} from "../../../../src/panels/lovelace/cards/clock/clock-date-format";

describe("clock-date-format", () => {
  const date = new Date("2024-11-08T10:20:30.000Z");

  it("returns an empty config when date format is missing", () => {
    assert.deepEqual(getClockCardDateConfig(), { parts: [] });
  });

  it("preserves literal token order", () => {
    const config = getClockCardDateConfig({
      date_format: [
        "day-numeric",
        "separator-dot",
        "month-short",
        "month-long",
        "separator-slash",
        "year-2-digit",
        "year-numeric",
      ],
    });

    assert.deepEqual(config.parts, [
      "day-numeric",
      "separator-dot",
      "month-short",
      "month-long",
      "separator-slash",
      "year-2-digit",
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
        "month-long",
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

  it("formats output in configured part order with literal separators", () => {
    const result = formatClockCardDate(
      date,
      {
        parts: [
          "month-numeric",
          "separator-slash",
          "day-2-digit",
          "separator-dash",
          "year-2-digit",
        ],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "11/08-24");
  });

  it("uses separator only for the next gap", () => {
    const result = formatClockCardDate(
      date,
      {
        parts: [
          "day-numeric",
          "separator-dot",
          "month-numeric",
          "year-numeric",
        ],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "8.11 2024");
  });

  it("supports using the same separator style multiple times", () => {
    const result = formatClockCardDate(
      date,
      {
        parts: [
          "month-numeric",
          "separator-slash",
          "day-2-digit",
          "separator-slash",
          "year-2-digit",
        ],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "11/08/24");
  });

  it("allows multiple variants for the same date part", () => {
    const result = formatClockCardDate(
      date,
      {
        parts: ["month-short", "month-long", "year-numeric"],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "Nov November 2024");
  });

  it("filters invalid tokens when formatting", () => {
    const config = getClockCardDateConfig({
      date_format: [
        "month-numeric",
        "invalid",
        "year-numeric",
      ] as unknown as ClockCardDatePart[],
    });

    const result = formatClockCardDate(date, config, "en", "UTC");

    assert.equal(result, "11 2024");
  });
});
