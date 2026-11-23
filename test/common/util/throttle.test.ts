import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { throttle } from "../../../src/common/util/throttle";

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "Date"],
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

  it("calls on the leading edge and once more on the trailing edge", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 500);

    throttled("a");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith("a");

    throttled("b");
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("b");
  });

  it("uses the latest arguments for the trailing call", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 500);

    throttled("a");
    throttled("b");
    vi.advanceTimersByTime(100);
    throttled("c");
    vi.advanceTimersByTime(100);
    throttled("d");

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, "a");
    expect(fn).toHaveBeenNthCalledWith(2, "d");
  });

  it("uses the latest arguments when leading is disabled", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 500, false);

    throttled("a");
    throttled("b");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith("b");
  });

  it("does not call on the trailing edge when trailing is disabled", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 500, true, false);

    throttled("a");
    throttled("b");
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith("a");
  });

  it("drops the pending trailing call on cancel", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 500);

    throttled("a");
    throttled("b");
    throttled.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);

    throttled("c");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("c");
  });
});
