import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CacheManager } from "../../src/util/cache-manager";

describe("cache-manager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it("should return value before expiration", async () => {
    const cacheManager = new CacheManager<string>(1000);
    cacheManager.set("key", "value");

    expect(cacheManager.has("key")).toBe(true);
    expect(cacheManager.get("key")).toBe("value");

    vi.advanceTimersByTime(500);
    expect(cacheManager.has("key")).toBe(true);
    expect(cacheManager.get("key")).toBe("value");
  });

  it("should return value before expiration", async () => {
    const cacheManager = new CacheManager<string>(1000);
    cacheManager.set("key", "value");

    expect(cacheManager.has("key")).toBe(true);
    expect(cacheManager.get("key")).toBe("value");

    vi.advanceTimersByTime(2000);
    expect(cacheManager.has("key")).toBe(false);
    expect(cacheManager.get("key")).toBe(undefined);
  });

  it("should always return value if no expiration", async () => {
    const cacheManager = new CacheManager<string>();
    cacheManager.set("key", "value");

    expect(cacheManager.has("key")).toBe(true);
    expect(cacheManager.get("key")).toBe("value");

    vi.advanceTimersByTime(10000000000000000000000);
    expect(cacheManager.has("key")).toBe(true);
    expect(cacheManager.get("key")).toBe("value");
  });
});
