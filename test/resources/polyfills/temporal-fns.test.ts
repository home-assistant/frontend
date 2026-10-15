import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import * as TemporalInstant from "temporal-polyfill/fns/Instant";
import * as TemporalPlainDateTime from "temporal-polyfill/fns/PlainDateTime";
import * as TemporalZonedDateTime from "temporal-polyfill/fns/ZonedDateTime";
import { describe, expect, it } from "vitest";
import * as Instant from "../../../src/resources/polyfills/temporal-fns/instant";
import * as PlainDateTime from "../../../src/resources/polyfills/temporal-fns/plain-date-time";
import * as ZonedDateTime from "../../../src/resources/polyfills/temporal-fns/zoned-date-time";

// The legacy build swaps these in for temporal-polyfill, which needs BigInt.
// Mirrors how @full-ui/headless-calendar's DateEnv calls them.
const TIME_ZONES = [
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/Amsterdam",
  "Europe/London",
  "Asia/Kolkata",
  "Australia/Lord_Howe",
  "Pacific/Chatham",
  "Etc/GMT+5",
];
const START = Date.UTC(2026, 0, 1);
const END = Date.UTC(2027, 0, 1);
// Shorter than Lord Howe's 30 minute DST shift
const STEP = 29 * 60 * 1000;

const wallFields = (zdt) => [
  zdt.year,
  zdt.month,
  zdt.day,
  zdt.hour,
  zdt.minute,
  zdt.second,
  zdt.millisecond,
];

it("covers every Temporal function FullCalendar calls", () => {
  const require = createRequire(import.meta.url);
  const headless = createRequire(
    dirname(require.resolve("fullcalendar/package.json")) + "/"
  ).resolve("@full-ui/headless-calendar");
  const calls = readFileSync(headless, "utf8").match(
    /\b(?:Instant|PlainDateTime|ZonedDateTime)Fns\.\w+/g
  );
  expect(new Set(calls)).toEqual(
    new Set([
      "InstantFns.fromEpochMilliseconds",
      "InstantFns.toZonedDateTimeISO",
      "PlainDateTimeFns.create",
      "PlainDateTimeFns.toZonedDateTime",
      "ZonedDateTimeFns.offsetNanoseconds",
    ])
  );
});

describe.each(TIME_ZONES)("temporal-fns in %s", (timeZone) => {
  it("converts instants to wall-clock time", () => {
    for (let ms = START; ms < END; ms += STEP) {
      const zdt = Instant.toZonedDateTimeISO(
        Instant.fromEpochMilliseconds(ms),
        timeZone
      );
      const expected = TemporalInstant.toZonedDateTimeISO(
        TemporalInstant.fromEpochMilliseconds(ms),
        timeZone
      );
      expect(wallFields(zdt)).toEqual(wallFields(expected));
    }
  });

  it("converts wall-clock time to instants, including DST gaps and folds", () => {
    for (let ms = START; ms < END; ms += STEP) {
      const wall = new Date(ms);
      const fields = [
        wall.getUTCFullYear(),
        wall.getUTCMonth() + 1,
        wall.getUTCDate(),
        wall.getUTCHours(),
        wall.getUTCMinutes(),
        wall.getUTCSeconds(),
        wall.getUTCMilliseconds(),
      ] as const;
      const zdt = PlainDateTime.toZonedDateTime(
        PlainDateTime.create(...fields),
        timeZone
      );
      const expected = TemporalPlainDateTime.toZonedDateTime(
        TemporalPlainDateTime.create(...fields),
        timeZone
      );
      expect(zdt.epochMilliseconds).toBe(expected.epochMilliseconds);
      expect(ZonedDateTime.offsetNanoseconds(zdt)).toBe(
        TemporalZonedDateTime.offsetNanoseconds(expected)
      );
    }
  });
});
