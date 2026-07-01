import type { HassConfig } from "home-assistant-js-websocket";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calcDateRange } from "../../../src/common/datetime/calc_date_range";
import {
  type FrontendLocaleData,
  TimeZone,
} from "../../../src/data/translation";

const locale: FrontendLocaleData = {
  language: "en-US",
  time_zone: TimeZone.local,
} as any;
const localeServer: FrontendLocaleData = {
  language: "en-US",
  time_zone: TimeZone.server,
} as any;
const config: HassConfig = { time_zone: "Etc/UTC" } as any;

// Fixed "now": 2024-01-15 13:30:45.500. The test environment forces TZ=Etc/UTC
// (see test/vitest.config.ts), so local-time assertions are deterministic.
const NOW = new Date(2024, 0, 15, 13, 30, 45, 500);
const HOUR = 60 * 60 * 1000;

describe("calcDateRange", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe("hour-based ranges", () => {
    it("now-2h returns the expected absolute range", () => {
      expect(calcDateRange(locale, config, "now-2h")).toEqual([
        new Date(2024, 0, 15, 11, 30, 45, 500),
        new Date(2024, 0, 15, 13, 30, 45, 500),
      ]);
    });

    it("now-4h returns the expected absolute range", () => {
      expect(calcDateRange(locale, config, "now-4h")).toEqual([
        new Date(2024, 0, 15, 9, 30, 45, 500),
        new Date(2024, 0, 15, 13, 30, 45, 500),
      ]);
    });

    it("now-8h returns the expected absolute range", () => {
      expect(calcDateRange(locale, config, "now-8h")).toEqual([
        new Date(2024, 0, 15, 5, 30, 45, 500),
        new Date(2024, 0, 15, 13, 30, 45, 500),
      ]);
    });

    it.each([
      ["now-1h", 1],
      ["now-2h", 2],
      ["now-4h", 4],
      ["now-8h", 8],
      ["now-12h", 12],
      ["now-24h", 24],
    ] as const)(
      "%s ends at now and starts %i hour(s) earlier",
      (range, hours) => {
        const [start, end] = calcDateRange(locale, config, range);
        expect(end).toEqual(NOW);
        expect(end.getTime() - start.getTime()).toBe(hours * HOUR);
      }
    );
  });

  describe("existing ranges (regression)", () => {
    it("today spans the whole current day", () => {
      expect(calcDateRange(locale, config, "today")).toEqual([
        new Date(2024, 0, 15, 0, 0, 0, 0),
        new Date(2024, 0, 15, 23, 59, 59, 999),
      ]);
    });

    it("yesterday spans the whole previous day", () => {
      expect(calcDateRange(locale, config, "yesterday")).toEqual([
        new Date(2024, 0, 14, 0, 0, 0, 0),
        new Date(2024, 0, 14, 23, 59, 59, 999),
      ]);
    });
  });

  describe("server time zone", () => {
    it("now-4h spans four hours", () => {
      const [start, end] = calcDateRange(localeServer, config, "now-4h");
      expect(end.getTime() - start.getTime()).toBe(4 * HOUR);
    });
  });
});
