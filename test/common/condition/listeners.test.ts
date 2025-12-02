import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setupTimeListeners,
  setupMediaQueryListeners,
} from "../../../src/common/condition/listeners";
import * as timeCalculator from "../../../src/common/condition/time-calculator";
import type {
  TimeCondition,
  ScreenCondition,
  Condition,
} from "../../../src/panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../../src/types";
import * as mediaQuery from "../../../src/common/dom/media_query";

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

  describe("listener cleanup", () => {
    it("should register cleanup function for each time condition", () => {
      const normalDelay = 5000;

      vi.spyOn(timeCalculator, "calculateNextTimeUpdate").mockReturnValue(
        normalDelay
      );

      const conditions: TimeCondition[] = [
        {
          condition: "time",
          after: "08:00",
        },
        {
          condition: "time",
          before: "17:00",
        },
      ];

      setupTimeListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      // Should have registered 2 cleanup functions (one per time condition)
      expect(listeners).toHaveLength(2);
    });

    it("should clear timeout when cleanup is called", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      const normalDelay = 5000;

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

      // Call cleanup
      listeners[0]();

      // Should have cleared the timeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("no time conditions", () => {
    it("should not setup listeners when no time conditions exist", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      setupTimeListeners(
        [],
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      // Should not have called setTimeout
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(listeners).toHaveLength(0);
    });
  });

  describe("undefined delay handling", () => {
    it("should not setup timeout when calculateNextTimeUpdate returns undefined", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      vi.spyOn(timeCalculator, "calculateNextTimeUpdate").mockReturnValue(
        undefined
      );

      const conditions: TimeCondition[] = [
        {
          condition: "time",
          weekdays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        },
      ];

      setupTimeListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      // Should not have called setTimeout
      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });
  });
});

describe("setupMediaQueryListeners", () => {
  let hass: HomeAssistant;
  let listeners: (() => void)[];
  let onUpdateCallback: (conditionsMet: boolean) => void;
  let listenMediaQuerySpy: any;

  beforeEach(() => {
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

    // Mock matchMedia for screen condition checks
    global.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Mock listenMediaQuery to capture the callback
    listenMediaQuerySpy = vi
      .spyOn(mediaQuery, "listenMediaQuery")
      .mockImplementation((_query, _callback) => vi.fn());
  });

  afterEach(() => {
    listeners.forEach((unsub) => unsub());
    vi.restoreAllMocks();
  });

  describe("single media query", () => {
    it("should setup listener for single screen condition", () => {
      const conditions: Condition[] = [
        {
          condition: "screen",
          media_query: "(max-width: 600px)",
        } as ScreenCondition,
      ];

      setupMediaQueryListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      expect(listenMediaQuerySpy).toHaveBeenCalledWith(
        "(max-width: 600px)",
        expect.any(Function)
      );
      expect(listeners).toHaveLength(1);
    });

    it("should call onUpdate with matches value for single screen condition", () => {
      const conditions: Condition[] = [
        {
          condition: "screen",
          media_query: "(max-width: 600px)",
        } as ScreenCondition,
      ];

      let capturedCallback: ((matches: boolean) => void) | undefined;

      listenMediaQuerySpy.mockImplementation((_query, callback) => {
        capturedCallback = callback;
        return vi.fn();
      });

      setupMediaQueryListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      // Simulate media query match
      capturedCallback?.(true);

      // Should call onUpdate directly with the matches value
      expect(onUpdateCallback).toHaveBeenCalledWith(true);
    });
  });

  describe("multiple media queries", () => {
    it("should setup listeners for multiple screen conditions", () => {
      const conditions: Condition[] = [
        {
          condition: "screen",
          media_query: "(max-width: 600px)",
        } as ScreenCondition,
        {
          condition: "screen",
          media_query: "(orientation: portrait)",
        } as ScreenCondition,
      ];

      setupMediaQueryListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      expect(listenMediaQuerySpy).toHaveBeenCalledWith(
        "(max-width: 600px)",
        expect.any(Function)
      );
      expect(listenMediaQuerySpy).toHaveBeenCalledWith(
        "(orientation: portrait)",
        expect.any(Function)
      );
      expect(listeners).toHaveLength(2);
    });

    it("should call onUpdate when media query changes with mixed conditions", () => {
      const conditions: Condition[] = [
        {
          condition: "screen",
          media_query: "(max-width: 600px)",
        } as ScreenCondition,
        {
          condition: "time",
          after: "08:00",
        } as TimeCondition,
      ];

      let capturedCallback: ((matches: boolean) => void) | undefined;

      listenMediaQuerySpy.mockImplementation((_query, callback) => {
        capturedCallback = callback;
        return vi.fn();
      });

      setupMediaQueryListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      // Simulate media query change
      capturedCallback?.(true);

      // Should call onUpdate (would check all conditions)
      expect(onUpdateCallback).toHaveBeenCalled();
    });
  });

  describe("no screen conditions", () => {
    it("should not setup listeners when no screen conditions exist", () => {
      const conditions: Condition[] = [
        {
          condition: "time",
          after: "08:00",
        } as TimeCondition,
      ];

      setupMediaQueryListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      expect(listenMediaQuerySpy).not.toHaveBeenCalled();
      expect(listeners).toHaveLength(0);
    });

    it("should handle empty conditions array", () => {
      setupMediaQueryListeners(
        [],
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      expect(listenMediaQuerySpy).not.toHaveBeenCalled();
      expect(listeners).toHaveLength(0);
    });
  });

  describe("listener cleanup", () => {
    it("should register cleanup functions", () => {
      const unsubFn = vi.fn();

      listenMediaQuerySpy.mockReturnValue(unsubFn);

      const conditions: Condition[] = [
        {
          condition: "screen",
          media_query: "(max-width: 600px)",
        } as ScreenCondition,
      ];

      setupMediaQueryListeners(
        conditions,
        hass,
        (unsub) => listeners.push(unsub),
        onUpdateCallback
      );

      expect(listeners).toHaveLength(1);

      // Call cleanup
      listeners[0]();

      // Should have called the unsubscribe function
      expect(unsubFn).toHaveBeenCalled();
    });
  });
});
