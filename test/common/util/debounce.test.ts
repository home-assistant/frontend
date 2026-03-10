import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "../../../src/common/util/debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout"],
      shouldAdvanceTime: false,
    });
    vi.stubGlobal("window", {
      ...window,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("without immediate", () => {
    it("calls function after wait period", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("resets timer on subsequent calls", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500);

      debounced();
      vi.advanceTimersByTime(300);
      debounced();
      vi.advanceTimersByTime(300);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("uses the latest arguments", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500);

      debounced("a");
      debounced("b");
      debounced("c");

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("c");
    });
  });

  describe("with immediate", () => {
    it("calls function immediately on first call", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500, true);

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("does not call again on trailing edge for a single call", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500, true);

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("calls trailing edge when there are additional calls during wait", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500, true);

      debounced("a");
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("a");

      debounced("b");
      debounced("c");
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith("c");
    });

    it("does not fire leading edge during cooldown", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500, true);

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(200);
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("allows a new leading call after cooldown expires", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500, true);

      debounced("first");
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);

      debounced("second");
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith("second");
    });
  });

  describe("cancel", () => {
    it("cancels pending trailing call", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500);

      debounced();
      debounced.cancel();

      vi.advanceTimersByTime(500);
      expect(fn).not.toHaveBeenCalled();
    });

    it("cancels pending trailing call with immediate", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 500, true);

      debounced("a");
      debounced("b");
      expect(fn).toHaveBeenCalledTimes(1);

      debounced.cancel();

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
