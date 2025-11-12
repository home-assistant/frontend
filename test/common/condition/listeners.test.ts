import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupTimeListeners } from "../../../src/common/condition/listeners";
import * as timeCalculator from "../../../src/common/condition/time-calculator";
import type { TimeCondition } from "../../../src/panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../../src/types";

// Maximum delay for setTimeout (2^31 - 1 milliseconds, ~24.8 days)
const MAX_TIMEOUT_DELAY = 2147483647;

describe("setupTimeListeners", () => {
  let hass: HomeAssistant;
  let listeners: (() => void)[];
  let onUpdateCallback: (conditionsMet: boolean) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    listeners = [];
    onUpdateCallback = vi.fn();

    hass = {
      locale: {
        time_zone: "local",
      },
      config: {
        time_zone: "America/New_York",
      },
    } as HomeAssistant;
  });

  afterEach(() => {
    listeners.forEach((unsub) => unsub());
    vi.restoreAllMocks();
  });

  describe("setTimeout overflow protection", () => {
    it("should cap delay at MAX_TIMEOUT_DELAY", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      // Mock calculateNextTimeUpdate to return a delay exceeding the max
      vi.spyOn(timeCalculator, "calculateNextTimeUpdate").mockReturnValue(
        MAX_TIMEOUT_DELAY + 1000000
      );

      const conditions: TimeCondition[] = [
        {
          condition: "time",
          after: "08:00",
        },
      ];

      setupTimeListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      // Verify setTimeout was called with the capped delay
      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        MAX_TIMEOUT_DELAY
      );
    });

    it("should not call onUpdate when hitting the cap", () => {
      // Mock calculateNextTimeUpdate to return delays that decrease over time
      // Both first and second delays exceed the cap
      const delays = [
        MAX_TIMEOUT_DELAY + 1000000,
        MAX_TIMEOUT_DELAY + 500000,
        1000,
      ];
      let callCount = 0;

      vi.spyOn(timeCalculator, "calculateNextTimeUpdate").mockImplementation(
        () => delays[callCount++]
      );

      const conditions: TimeCondition[] = [
        {
          condition: "time",
          after: "08:00",
        },
      ];

      setupTimeListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      // Fast-forward to when the first timeout fires (at the cap)
      vi.advanceTimersByTime(MAX_TIMEOUT_DELAY);

      // onUpdate should NOT have been called because we hit the cap
      expect(onUpdateCallback).not.toHaveBeenCalled();

      // Fast-forward to the second timeout (still exceeds cap)
      vi.advanceTimersByTime(MAX_TIMEOUT_DELAY);

      // Still should not have been called
      expect(onUpdateCallback).not.toHaveBeenCalled();

      // Fast-forward to the third timeout (within cap)
      vi.advanceTimersByTime(1000);

      // NOW onUpdate should have been called
      expect(onUpdateCallback).toHaveBeenCalledTimes(1);
    });

    it("should call onUpdate normally when delay is within cap", () => {
      const normalDelay = 5000; // 5 seconds

      vi.spyOn(timeCalculator, "calculateNextTimeUpdate").mockReturnValue(
        normalDelay
      );

      const conditions: TimeCondition[] = [
        {
          condition: "time",
          after: "08:00",
        },
      ];

      setupTimeListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      // Fast-forward by the normal delay
      vi.advanceTimersByTime(normalDelay);

      // onUpdate should have been called
      expect(onUpdateCallback).toHaveBeenCalledTimes(1);
    });

    it("should reschedule after hitting the cap", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      // First delay exceeds cap, second delay is normal
      const delays = [MAX_TIMEOUT_DELAY + 1000000, 5000];
      let callCount = 0;

      vi.spyOn(timeCalculator, "calculateNextTimeUpdate").mockImplementation(
        () => delays[callCount++]
      );

      const conditions: TimeCondition[] = [
        {
          condition: "time",
          after: "08:00",
        },
      ];

      setupTimeListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      // First setTimeout call should use the capped delay
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        MAX_TIMEOUT_DELAY
      );

      // Fast-forward to when the first timeout fires
      vi.advanceTimersByTime(MAX_TIMEOUT_DELAY);

      // Second setTimeout call should use the normal delay
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(
        2,
        expect.any(Function),
        5000
      );
    });
  });
});
