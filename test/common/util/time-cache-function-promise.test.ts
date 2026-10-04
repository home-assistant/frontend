import { describe, expect, it, vi } from "vitest";

import { timeCachePromiseFunc } from "../../../src/common/util/time-cache-function-promise";

describe("timeCachePromiseFunc", () => {
  it("reuses an in-flight request when the cache key is unchanged", async () => {
    let resolveRequest!: (value: string) => void;

    const request = new Promise<string>((resolve) => {
      resolveRequest = resolve;
    });

    const fetchData = vi.fn(() => request);
    const hass = { version: 1 };

    const calls = Array.from({ length: 20 }, () =>
      timeCachePromiseFunc(
        "_testCache",
        30_000,
        fetchData,
        (currentHass: typeof hass) => currentHass.version,
        hass
      )
    );

    expect(fetchData).toHaveBeenCalledTimes(1);

    resolveRequest("result");

    await expect(Promise.all(calls)).resolves.toEqual(Array(20).fill("result"));

    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it("reuses a resolved cached result while the cache key is unchanged", async () => {
    const fetchData = vi.fn().mockResolvedValue("result");
    const hass = { version: 1 };

    const first = await timeCachePromiseFunc(
      "_testCache",
      30_000,
      fetchData,
      (currentHass: typeof hass) => currentHass.version,
      hass
    );

    const second = await timeCachePromiseFunc(
      "_testCache",
      30_000,
      fetchData,
      (currentHass: typeof hass) => currentHass.version,
      hass
    );

    expect(first).toBe("result");
    expect(second).toBe("result");
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it("refetches a resolved cached result when the cache key changes", async () => {
    const fetchData = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    const hass = { version: 1 };

    const first = await timeCachePromiseFunc(
      "_testCache",
      30_000,
      fetchData,
      (currentHass: typeof hass) => currentHass.version,
      hass
    );

    hass.version = 2;

    const second = await timeCachePromiseFunc(
      "_testCache",
      30_000,
      fetchData,
      (currentHass: typeof hass) => currentHass.version,
      hass
    );

    expect(first).toBe("first");
    expect(second).toBe("second");
    expect(fetchData).toHaveBeenCalledTimes(2);
  });

  it("reuses an in-flight request without a cache key validator", async () => {
    let resolveRequest!: (value: string) => void;

    const request = new Promise<string>((resolve) => {
      resolveRequest = resolve;
    });

    const fetchData = vi.fn(() => request);
    const hass = {};

    const first = timeCachePromiseFunc(
      "_testCacheNoValidator",
      30_000,
      fetchData,
      undefined,
      hass
    );

    const second = timeCachePromiseFunc(
      "_testCacheNoValidator",
      30_000,
      fetchData,
      undefined,
      hass
    );

    expect(fetchData).toHaveBeenCalledTimes(1);

    resolveRequest("result");

    await expect(first).resolves.toBe("result");
    await expect(second).resolves.toBe("result");
    expect(fetchData).toHaveBeenCalledTimes(1);
  });
});

describe("timeCachePromiseFunc cache ownership", () => {
  it("does not let an older cache timer clear a newer cached result", async () => {
    vi.useFakeTimers();

    try {
      const fetchData = vi
        .fn()
        .mockResolvedValueOnce("first")
        .mockResolvedValueOnce("second")
        .mockResolvedValueOnce("third");

      const hass = { version: 1 };

      await timeCachePromiseFunc(
        "_testTimerOwnership",
        1000,
        fetchData,
        (currentHass: typeof hass) => currentHass.version,
        hass
      );

      await vi.advanceTimersByTimeAsync(500);

      hass.version = 2;

      await timeCachePromiseFunc(
        "_testTimerOwnership",
        1000,
        fetchData,
        (currentHass: typeof hass) => currentHass.version,
        hass
      );

      expect(fetchData).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(500);

      const result = await timeCachePromiseFunc(
        "_testTimerOwnership",
        1000,
        fetchData,
        (currentHass: typeof hass) => currentHass.version,
        hass
      );

      expect(result).toBe("second");
      expect(fetchData).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
