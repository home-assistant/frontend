import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateNextTimeUpdate } from "../../../src/common/condition/time-calculator";
import type { HomeAssistant } from "../../../src/types";
import {
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../../src/data/translation";

describe("calculateNextTimeUpdate", () => {
  let mockHass: HomeAssistant;

  beforeEach(() => {
    mockHass = {
      locale: {
        language: "en-US",
        number_format: NumberFormat.language,
        time_format: TimeFormat.language,
        date_format: DateFormat.language,
        time_zone: TimeZone.local,
        first_weekday: FirstWeekday.language,
      },
      config: {
        time_zone: "America/Los_Angeles",
      },
    } as HomeAssistant;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("after time calculation", () => {
    it("should calculate time until after time today when it hasn't passed", () => {
      // Set time to 7:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 7, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { after: "08:00" });

      // Should be ~1 hour + 1 minute buffer = 61 minutes
      expect(result).toBeGreaterThan(60 * 60 * 1000); // > 60 minutes
      expect(result).toBeLessThan(62 * 60 * 1000); // < 62 minutes
    });

    it("should calculate time until after time tomorrow when it has passed", () => {
      // Set time to 9:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 9, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { after: "08:00" });

      // Should be ~23 hours + 1 minute buffer
      expect(result).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(result).toBeLessThan(24 * 60 * 60 * 1000);
    });

    it("should handle after time exactly at current time", () => {
      // Set time to 8:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 8, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { after: "08:00" });

      // Should be scheduled for tomorrow
      expect(result).toBeGreaterThan(23 * 60 * 60 * 1000);
    });

    it("should handle after time with seconds", () => {
      // Set time to 7:59:30 AM
      vi.setSystemTime(new Date(2024, 0, 15, 7, 59, 30));

      const result = calculateNextTimeUpdate(mockHass, { after: "08:00:00" });

      // Should be ~30 seconds + 1 minute buffer
      expect(result).toBeGreaterThan(30 * 1000);
      expect(result).toBeLessThan(2 * 60 * 1000);
    });
  });

  describe("before time calculation", () => {
    it("should calculate time until before time today when it hasn't passed", () => {
      // Set time to 4:00 PM
      vi.setSystemTime(new Date(2024, 0, 15, 16, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { before: "17:00" });

      // Should be ~1 hour + 1 minute buffer
      expect(result).toBeGreaterThan(60 * 60 * 1000);
      expect(result).toBeLessThan(62 * 60 * 1000);
    });

    it("should calculate time until before time tomorrow when it has passed", () => {
      // Set time to 6:00 PM
      vi.setSystemTime(new Date(2024, 0, 15, 18, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { before: "17:00" });

      // Should be ~23 hours + 1 minute buffer
      expect(result).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(result).toBeLessThan(24 * 60 * 60 * 1000);
    });
  });

  describe("combined after and before", () => {
    it("should return the soonest boundary when both are in the future", () => {
      // Set time to 7:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 7, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {
        after: "08:00",
        before: "17:00",
      });

      // Should return time until 8:00 AM (soonest)
      expect(result).toBeGreaterThan(60 * 60 * 1000); // > 60 minutes
      expect(result).toBeLessThan(62 * 60 * 1000); // < 62 minutes
    });

    it("should return the soonest boundary when within the range", () => {
      // Set time to 10:00 AM (within 08:00-17:00 range)
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {
        after: "08:00",
        before: "17:00",
      });

      // Should return time until 5:00 PM (next boundary)
      expect(result).toBeGreaterThan(7 * 60 * 60 * 1000); // > 7 hours
      expect(result).toBeLessThan(8 * 60 * 60 * 1000); // < 8 hours
    });

    it("should handle midnight crossing range", () => {
      // Set time to 11:00 PM
      vi.setSystemTime(new Date(2024, 0, 15, 23, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {
        after: "22:00",
        before: "06:00",
      });

      // Should return time until 6:00 AM (next boundary)
      expect(result).toBeGreaterThan(7 * 60 * 60 * 1000); // > 7 hours
      expect(result).toBeLessThan(8 * 60 * 60 * 1000); // < 8 hours
    });
  });

  describe("weekday boundaries", () => {
    it("should schedule for midnight when weekdays are specified (not all 7)", () => {
      // Set time to Monday 10:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {
        weekdays: ["mon", "wed", "fri"],
      });

      // Should be scheduled for midnight (Tuesday)
      expect(result).toBeGreaterThan(14 * 60 * 60 * 1000); // > 14 hours
      expect(result).toBeLessThan(15 * 60 * 60 * 1000); // < 15 hours
    });

    it("should not schedule midnight when all 7 weekdays specified", () => {
      // Set time to Monday 10:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {
        weekdays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      });

      // Should return undefined (no boundaries)
      expect(result).toBeUndefined();
    });

    it("should combine weekday midnight with after time", () => {
      // Set time to Monday 7:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 7, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {
        after: "08:00",
        weekdays: ["mon", "wed", "fri"],
      });

      // Should return the soonest (8:00 AM is sooner than midnight)
      expect(result).toBeGreaterThan(60 * 60 * 1000); // > 60 minutes
      expect(result).toBeLessThan(62 * 60 * 1000); // < 62 minutes
    });

    it("should prefer midnight over later time boundary", () => {
      // Set time to Monday 11:00 PM
      vi.setSystemTime(new Date(2024, 0, 15, 23, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {
        after: "08:00",
        weekdays: ["mon", "wed", "fri"],
      });

      // Should return midnight (sooner than 8:00 AM)
      expect(result).toBeGreaterThan(60 * 60 * 1000); // > 1 hour
      expect(result).toBeLessThan(2 * 60 * 60 * 1000); // < 2 hours
    });
  });

  describe("no boundaries", () => {
    it("should return undefined when no conditions specified", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {});

      expect(result).toBeUndefined();
    });

    it("should return undefined when only all weekdays specified", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {
        weekdays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      });

      expect(result).toBeUndefined();
    });

    it("should return undefined when empty weekdays array", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, {
        weekdays: [],
      });

      expect(result).toBeUndefined();
    });
  });

  describe("buffer addition", () => {
    it("should add 1 minute buffer to next update time", () => {
      // Set time to 7:59 AM
      vi.setSystemTime(new Date(2024, 0, 15, 7, 59, 0));

      const result = calculateNextTimeUpdate(mockHass, { after: "08:00" });

      // Should be ~1 minute for the boundary + 1 minute buffer = ~2 minutes
      expect(result).toBeGreaterThan(60 * 1000); // > 1 minute
      expect(result).toBeLessThan(3 * 60 * 1000); // < 3 minutes
    });
  });

  describe("timezone handling", () => {
    it("should use server timezone when configured", () => {
      mockHass.locale.time_zone = TimeZone.server;
      mockHass.config.time_zone = "America/New_York";

      // Set time to 7:00 AM local time
      vi.setSystemTime(new Date(2024, 0, 15, 7, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { after: "08:00" });

      // Should calculate based on server timezone
      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
    });

    it("should use local timezone when configured", () => {
      mockHass.locale.time_zone = TimeZone.local;

      // Set time to 7:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 7, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { after: "08:00" });

      // Should calculate based on local timezone
      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle midnight (00:00) as after time", () => {
      // Set time to 11:00 PM
      vi.setSystemTime(new Date(2024, 0, 15, 23, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { after: "00:00" });

      // Should be ~1 hour + 1 minute buffer until midnight
      expect(result).toBeGreaterThan(60 * 60 * 1000);
      expect(result).toBeLessThan(62 * 60 * 1000);
    });

    it("should handle 23:59 as before time", () => {
      // Set time to 11:00 PM
      vi.setSystemTime(new Date(2024, 0, 15, 23, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { before: "23:59" });

      // Should be ~59 minutes + 1 minute buffer
      expect(result).toBeGreaterThan(59 * 60 * 1000);
      expect(result).toBeLessThan(61 * 60 * 1000);
    });

    it("should handle very close boundary (seconds away)", () => {
      // Set time to 7:59:50 AM
      vi.setSystemTime(new Date(2024, 0, 15, 7, 59, 50));

      const result = calculateNextTimeUpdate(mockHass, { after: "08:00:00" });

      // Should be ~10 seconds + 1 minute buffer
      expect(result).toBeGreaterThan(10 * 1000);
      expect(result).toBeLessThan(2 * 60 * 1000);
    });

    it("should handle DST transition correctly", () => {
      // March 10, 2024 at 1:00 AM PST - before spring forward
      vi.setSystemTime(new Date(2024, 2, 10, 1, 0, 0));

      const result = calculateNextTimeUpdate(mockHass, { after: "03:00" });

      // Should handle the transition where 2:00 AM doesn't exist
      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
    });
  });
});
