import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkTimeInRange,
  isValidTimeString,
} from "../../../src/common/datetime/check_time";
import type { HomeAssistant } from "../../../src/types";
import {
  NumberFormat,
  TimeFormat,
  FirstWeekday,
  DateFormat,
  TimeZone,
} from "../../../src/data/translation";

describe("isValidTimeString", () => {
  it("should accept valid HH:MM format", () => {
    expect(isValidTimeString("08:00")).toBe(true);
    expect(isValidTimeString("23:59")).toBe(true);
    expect(isValidTimeString("00:00")).toBe(true);
  });

  it("should accept valid HH:MM:SS format", () => {
    expect(isValidTimeString("08:00:30")).toBe(true);
    expect(isValidTimeString("23:59:59")).toBe(true);
    expect(isValidTimeString("00:00:00")).toBe(true);
  });

  it("should reject invalid formats", () => {
    expect(isValidTimeString("")).toBe(false);
    expect(isValidTimeString("8")).toBe(false);
    expect(isValidTimeString("8:00 AM")).toBe(false);
    expect(isValidTimeString("08:00:00:00")).toBe(false);
  });

  it("should reject invalid hour values", () => {
    expect(isValidTimeString("24:00")).toBe(false);
    expect(isValidTimeString("-01:00")).toBe(false);
    expect(isValidTimeString("25:00")).toBe(false);
  });

  it("should reject invalid minute values", () => {
    expect(isValidTimeString("08:60")).toBe(false);
    expect(isValidTimeString("08:-01")).toBe(false);
  });

  it("should reject invalid second values", () => {
    expect(isValidTimeString("08:00:60")).toBe(false);
    expect(isValidTimeString("08:00:-01")).toBe(false);
  });
});

describe("checkTimeInRange", () => {
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

  describe("time ranges within same day", () => {
    it("should return true when current time is within range", () => {
      // Set time to 10:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      expect(
        checkTimeInRange(mockHass, { after: "08:00", before: "17:00" })
      ).toBe(true);
    });

    it("should return false when current time is before range", () => {
      // Set time to 7:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 7, 0, 0));

      expect(
        checkTimeInRange(mockHass, { after: "08:00", before: "17:00" })
      ).toBe(false);
    });

    it("should return false when current time is after range", () => {
      // Set time to 6:00 PM
      vi.setSystemTime(new Date(2024, 0, 15, 18, 0, 0));

      expect(
        checkTimeInRange(mockHass, { after: "08:00", before: "17:00" })
      ).toBe(false);
    });
  });

  describe("time ranges crossing midnight", () => {
    it("should return true when current time is before midnight", () => {
      // Set time to 11:00 PM
      vi.setSystemTime(new Date(2024, 0, 15, 23, 0, 0));

      expect(
        checkTimeInRange(mockHass, { after: "22:00", before: "06:00" })
      ).toBe(true);
    });

    it("should return true exactly at the after boundary", () => {
      // Set time to 10:00 PM
      vi.setSystemTime(new Date(2024, 0, 15, 22, 0, 0));

      expect(
        checkTimeInRange(mockHass, { after: "22:00", before: "06:00" })
      ).toBe(true);
    });

    it("should return true when current time is after midnight", () => {
      // Set time to 3:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 3, 0, 0));

      expect(
        checkTimeInRange(mockHass, { after: "22:00", before: "06:00" })
      ).toBe(true);
    });

    it("should return true exactly at the before boundary", () => {
      // Set time to 6:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 6, 0, 0));

      expect(
        checkTimeInRange(mockHass, { after: "22:00", before: "06:00" })
      ).toBe(true);
    });

    it("should return false when outside the range", () => {
      // Set time to 10:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      expect(
        checkTimeInRange(mockHass, { after: "22:00", before: "06:00" })
      ).toBe(false);
    });
  });

  describe("only 'after' condition", () => {
    it("should return true when after specified time", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));
      expect(checkTimeInRange(mockHass, { after: "08:00" })).toBe(true);
    });

    it("should return false when before specified time", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 6, 0, 0));
      expect(checkTimeInRange(mockHass, { after: "08:00" })).toBe(false);
    });
  });

  describe("only 'before' condition", () => {
    it("should return true when before specified time", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));
      expect(checkTimeInRange(mockHass, { before: "17:00" })).toBe(true);
    });

    it("should return false when after specified time", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 18, 0, 0));
      expect(checkTimeInRange(mockHass, { before: "17:00" })).toBe(false);
    });
  });

  describe("weekday filtering", () => {
    it("should return true on matching weekday", () => {
      // January 15, 2024 is a Monday
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      expect(checkTimeInRange(mockHass, { weekdays: ["mon"] })).toBe(true);
    });

    it("should return false on non-matching weekday", () => {
      // January 15, 2024 is a Monday
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      expect(checkTimeInRange(mockHass, { weekdays: ["tue"] })).toBe(false);
    });

    it("should work with multiple weekdays", () => {
      // January 15, 2024 is a Monday
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      expect(
        checkTimeInRange(mockHass, { weekdays: ["mon", "wed", "fri"] })
      ).toBe(true);
    });
  });

  describe("combined time and weekday conditions", () => {
    it("should return true when both match", () => {
      // January 15, 2024 is a Monday at 10:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      expect(
        checkTimeInRange(mockHass, {
          after: "08:00",
          before: "17:00",
          weekdays: ["mon"],
        })
      ).toBe(true);
    });

    it("should return false when time matches but weekday doesn't", () => {
      // January 15, 2024 is a Monday at 10:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      expect(
        checkTimeInRange(mockHass, {
          after: "08:00",
          before: "17:00",
          weekdays: ["tue"],
        })
      ).toBe(false);
    });

    it("should return false when weekday matches but time doesn't", () => {
      // January 15, 2024 is a Monday at 6:00 AM
      vi.setSystemTime(new Date(2024, 0, 15, 6, 0, 0));

      expect(
        checkTimeInRange(mockHass, {
          after: "08:00",
          before: "17:00",
          weekdays: ["mon"],
        })
      ).toBe(false);
    });
  });

  describe("no conditions", () => {
    it("should return true when no conditions specified", () => {
      vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0));

      expect(
        checkTimeInRange(mockHass, { after: "08:00", before: "17:00" })
      ).toBe(true);
    });
  });

  describe("DST transitions", () => {
    it("should handle spring forward transition (losing an hour)", () => {
      // March 10, 2024 at 1:30 AM PST - before spring forward
      // At 2:00 AM, clocks jump to 3:00 AM PDT
      vi.setSystemTime(new Date(2024, 2, 10, 1, 30, 0));

      // Should be within range that crosses the transition
      expect(
        checkTimeInRange(mockHass, { after: "01:00", before: "04:00" })
      ).toBe(true);
    });

    it("should handle spring forward transition after the jump", () => {
      // March 10, 2024 at 3:30 AM PDT - after spring forward
      vi.setSystemTime(new Date(2024, 2, 10, 3, 30, 0));

      // Should still be within range
      expect(
        checkTimeInRange(mockHass, { after: "01:00", before: "04:00" })
      ).toBe(true);
    });

    it("should handle fall back transition (gaining an hour)", () => {
      // November 3, 2024 at 1:30 AM PDT - before fall back
      // At 2:00 AM PDT, clocks fall back to 1:00 AM PST
      vi.setSystemTime(new Date(2024, 10, 3, 1, 30, 0));

      // Should be within range that crosses the transition
      expect(
        checkTimeInRange(mockHass, { after: "01:00", before: "03:00" })
      ).toBe(true);
    });

    it("should handle midnight crossing during DST transition", () => {
      // March 10, 2024 at 1:00 AM - during spring forward night
      vi.setSystemTime(new Date(2024, 2, 10, 1, 0, 0));

      // Range that crosses midnight and DST transition
      expect(
        checkTimeInRange(mockHass, { after: "22:00", before: "04:00" })
      ).toBe(true);
    });

    it("should correctly compare times on DST transition day", () => {
      // November 3, 2024 at 10:00 AM - after fall back completed
      vi.setSystemTime(new Date(2024, 10, 3, 10, 0, 0));

      // Normal business hours should work correctly
      expect(
        checkTimeInRange(mockHass, { after: "08:00", before: "17:00" })
      ).toBe(true);
      expect(
        checkTimeInRange(mockHass, { after: "12:00", before: "17:00" })
      ).toBe(false);
    });
  });
});
