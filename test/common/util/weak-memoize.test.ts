import { describe, expect, it, vi } from "vitest";
import { weakMemoize } from "../../../src/common/util/weak-memoize";

describe("weakMemoize", () => {
  it("computes once per key and returns the cached result", () => {
    const spy = vi.fn((arg: { id: number }) => ({ doubled: arg.id * 2 }));
    const memoized = weakMemoize(spy);

    const key = { id: 21 };
    const first = memoized(key);
    const second = memoized(key);

    expect(first).toEqual({ doubled: 42 });
    expect(second).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("computes separately for different keys", () => {
    const spy = vi.fn((arg: { id: number }) => arg.id);
    const memoized = weakMemoize(spy);

    const a = { id: 1 };
    const b = { id: 1 };
    expect(memoized(a)).toBe(1);
    expect(memoized(b)).toBe(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("caches falsy results without recomputing", () => {
    const spy = vi.fn(() => undefined);
    const memoized = weakMemoize(spy);

    const key = {};
    memoized(key);
    memoized(key);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("gives each memoized function its own cache", () => {
    const memoizedA = weakMemoize((arg: object) => arg);
    const memoizedB = weakMemoize(() => "b");
    const key = {};
    expect(memoizedA(key)).toBe(key);
    expect(memoizedB(key)).toBe("b");
  });
});
