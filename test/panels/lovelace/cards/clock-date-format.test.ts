import { assert, describe, it } from "vitest";
import type {
  ClockCardDatePart,
  ClockCardDatePreset,
} from "../../../../src/panels/lovelace/cards/types";
import {
  formatClockCardDate,
  formatClockCardDatePreset,
  getClockCardDateConfig,
  getClockCardDatePresetParts,
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
    assert.equal(hasClockCardDate({ date_format: ["separator-dot"] }), true);
    assert.equal(
      hasClockCardDate({ date_format: ["separator-new-line"] }),
      true
    );
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

  it("renders separators even when no value follows", () => {
    const result = formatClockCardDate(
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
    const result = formatClockCardDate(
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
    const result = formatClockCardDate(
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
    const result = formatClockCardDate(
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
    const result = formatClockCardDate(
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
    const result = formatClockCardDate(
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

  it("reads a preset date format", () => {
    assert.deepEqual(getClockCardDateConfig({ date_format: "long" }), {
      parts: [],
      preset: "long",
    });
    assert.equal(hasClockCardDate({ date_format: "short" }), true);
    assert.deepEqual(
      getClockCardDateTimeFormatOptions({ parts: [], preset: "full" }),
      { dateStyle: "full" }
    );
  });

  it("formats presets with the locale's date styles", () => {
    const format = (preset: ClockCardDatePreset, language = "en-GB") =>
      formatClockCardDate(date, { parts: [], preset }, language, "UTC");

    assert.equal(format("short"), "08/11/2024");
    assert.equal(format("medium"), "8 Nov 2024");
    assert.equal(format("long"), "8 November 2024");
    assert.equal(format("short", "en-US"), "11/8/24");
  });

  it("formats the ISO preset the same in every language", () => {
    const format = (language: string, timeZone: string) =>
      formatClockCardDatePreset(date, "iso", language, timeZone);

    assert.equal(format("en-US", "UTC"), "2024-11-08");
    assert.equal(format("ar-EG", "UTC"), "2024-11-08");
    assert.equal(format("en", "Pacific/Kiritimati"), "2024-11-09");
  });

  it("converts presets into matching custom parts", () => {
    assert.deepEqual(getClockCardDatePresetParts("short", "en-GB"), [
      "day-2-digit",
      "separator-slash",
      "month-2-digit",
      "separator-slash",
      "year-numeric",
    ]);
    assert.deepEqual(getClockCardDatePresetParts("full", "en-US"), [
      "weekday-long",
      "separator-comma",
      "month-long",
      "day-numeric",
      "separator-comma",
      "year-numeric",
    ]);
    assert.deepEqual(getClockCardDatePresetParts("short", "de"), [
      "day-2-digit",
      "separator-dot",
      "month-2-digit",
      "separator-dot",
      "year-2-digit",
    ]);

    (["en-GB", "en-US"] as const).forEach((language) => {
      (["short", "medium", "long", "full", "iso"] as const).forEach(
        (preset) => {
          const parts = getClockCardDatePresetParts(preset, language);
          assert.equal(
            formatClockCardDate(date, { parts }, language, "UTC"),
            formatClockCardDate(date, { parts: [], preset }, language, "UTC")
          );
        }
      );
    });
  });

  it("keeps the long month when a language inflects it next to the day", () => {
    (["pl", "ru"] as const).forEach((language) => {
      assert.deepEqual(
        getClockCardDatePresetParts("long", language).slice(0, 2),
        ["day-numeric", "month-long"]
      );
    });
  });

  it("matches date fields that a language formats with a suffix", () => {
    assert.deepEqual(getClockCardDatePresetParts("short", "ja"), [
      "year-numeric",
      "separator-slash",
      "month-2-digit",
      "separator-slash",
      "day-2-digit",
    ]);
    assert.deepEqual(
      getClockCardDatePresetParts("short", "ko").filter(
        (part) => !part.startsWith("separator-")
      ),
      ["year-2-digit", "month-numeric", "day-numeric"]
    );
  });

  it("matches separators that a right-to-left language marks", () => {
    assert.deepEqual(getClockCardDatePresetParts("short", "ar-EG"), [
      "day-numeric",
      "separator-slash",
      "month-numeric",
      "separator-slash",
      "year-numeric",
    ]);
  });

  it("prefers the standalone month width over the one next to a day", () => {
    assert.deepEqual(getClockCardDatePresetParts("short", "es"), [
      "day-numeric",
      "separator-slash",
      "month-numeric",
      "separator-slash",
      "year-2-digit",
    ]);
    assert.include(getClockCardDatePresetParts("short", "ga"), "month-numeric");
  });

  it("skips separators a part already renders", () => {
    assert.deepEqual(getClockCardDatePresetParts("short", "nb"), [
      "day-2-digit",
      "month-2-digit",
      "year-numeric",
    ]);
  });

  it("renders a comma separator with a following space", () => {
    const result = formatClockCardDate(
      date,
      {
        parts: ["weekday-long", "separator-comma", "month-long", "day-numeric"],
      },
      "en",
      "UTC"
    );

    assert.equal(result, "Friday, November 8");
  });
});
