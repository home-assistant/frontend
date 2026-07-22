import { assert, describe, it } from "vitest";
import type { DateFormatPart } from "../../../../src/panels/lovelace/cards/types";
import {
  formatDateFromParts,
  getDateFormatConfig,
  getDateFormatIntlOptions,
  hasDateFormatParts,
} from "../../../../src/panels/lovelace/cards/date-format";

describe("date-format", () => {
  const date = new Date("2024-11-08T10:20:30.000Z");

  it("returns an empty config when date format is missing", () => {
    assert.deepEqual(getDateFormatConfig(), { parts: [] });
  });

  it("preserves literal token order", () => {
    const config = getDateFormatConfig({
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
    const config = getDateFormatConfig({
      date_format: [
        "month-short",
        "invalid",
        "year-2-digit",
      ] as unknown as DateFormatPart[],
    });

    assert.deepEqual(config.parts, ["month-short", "year-2-digit"]);
  });

  it("builds Intl options from selected date tokens", () => {
    const options = getDateFormatIntlOptions({
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
    assert.equal(hasDateFormatParts(), false);
    assert.equal(hasDateFormatParts({ date_format: [] }), false);
    assert.equal(hasDateFormatParts({ date_format: ["separator-dot"] }), true);
    assert.equal(
      hasDateFormatParts({ date_format: ["separator-new-line"] }),
      true
    );
    assert.equal(hasDateFormatParts({ date_format: ["weekday-short"] }), true);
  });

  it("formats output in configured part order with literal separators", () => {
    const result = formatDateFromParts(
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
    const result = formatDateFromParts(
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
    const result = formatDateFromParts(
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

  it("renders separators even when no value follows", () => {
    const result = formatDateFromParts(
      date,
      {
        parts: ["day-numeric", "separator-dash", "separator-dot"],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "8-.");
  });

  it("renders separators even when no value precedes", () => {
    const result = formatDateFromParts(
      date,
      {
        parts: ["separator-slash", "separator-dot", "day-numeric"],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "/.8");
  });

  it("renders all consecutive separators between values", () => {
    const result = formatDateFromParts(
      date,
      {
        parts: [
          "day-numeric",
          "separator-dash",
          "separator-slash",
          "separator-dot",
          "month-numeric",
        ],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "8-/.11");
  });

  it("renders repeated separators without deduplication", () => {
    const result = formatDateFromParts(
      date,
      {
        parts: [
          "day-numeric",
          "separator-dash",
          "separator-dash",
          "separator-dash",
          "month-numeric",
        ],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "8---11");
  });

  it("renders separator-only configurations", () => {
    const result = formatDateFromParts(
      date,
      {
        parts: ["separator-dash", "separator-slash", "separator-dot"],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "-/.");
  });

  it("supports inserting a new line between date values", () => {
    const result = formatDateFromParts(
      date,
      {
        parts: [
          "month-numeric",
          "separator-new-line",
          "day-2-digit",
          "year-numeric",
        ],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "11\n08 2024");
  });

  it("allows multiple variants for the same date part", () => {
    const result = formatDateFromParts(
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
    const config = getDateFormatConfig({
      date_format: [
        "month-numeric",
        "invalid",
        "year-numeric",
      ] as unknown as DateFormatPart[],
    });

    const result = formatDateFromParts(date, config, "en", "UTC");

    assert.equal(result, "11 2024");
  });
});
