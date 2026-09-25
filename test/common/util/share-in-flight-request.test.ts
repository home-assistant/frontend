import { describe, expect, it, vi } from "vitest";

import { shareInFlightRequest } from "../../../src/common/util/share-in-flight-request";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe("shareInFlightRequest", () => {
  it("shares an in-flight request for the same owner and key", async () => {
    const owner = {};
    const request = deferred<number>();
    const fetcher = vi.fn(() => request.promise);

    const first = shareInFlightRequest(owner, "resource:a", fetcher);
    const second = shareInFlightRequest(owner, "resource:a", fetcher);

    expect(first).toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(1);

    request.resolve(42);

    await expect(first).resolves.toBe(42);
    await expect(second).resolves.toBe(42);
  });

  it("does not share requests with different keys", async () => {
    const owner = {};
    const fetcherA = vi.fn(async () => "a");
    const fetcherB = vi.fn(async () => "b");

    await Promise.all([
      shareInFlightRequest(owner, "resource:a", fetcherA),
      shareInFlightRequest(owner, "resource:b", fetcherB),
    ]);

    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1);
  });

  it("does not share requests between different owners", async () => {
    const firstOwner = {};
    const secondOwner = {};
    const firstFetcher = vi.fn(async () => "first");
    const secondFetcher = vi.fn(async () => "second");

    await Promise.all([
      shareInFlightRequest(firstOwner, "resource:a", firstFetcher),
      shareInFlightRequest(secondOwner, "resource:a", secondFetcher),
    ]);

    expect(firstFetcher).toHaveBeenCalledTimes(1);
    expect(secondFetcher).toHaveBeenCalledTimes(1);
  });

  it("forgets a request after it resolves", async () => {
    const owner = {};
    const fetcher = vi.fn(async () => 42);

    await shareInFlightRequest(owner, "resource:a", fetcher);
    await shareInFlightRequest(owner, "resource:a", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("forgets a request after it rejects", async () => {
    const owner = {};
    const fetcher = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce(42);

    await expect(
      shareInFlightRequest(owner, "resource:a", fetcher)
    ).rejects.toThrow("failed");

    await expect(
      shareInFlightRequest(owner, "resource:a", fetcher)
    ).resolves.toBe(42);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("deep-freezes resolved results", async () => {
    const owner = {};
    const result = { items: ["a"] };
    const fetcher = vi.fn(async () => result);

    const shared = await shareInFlightRequest(owner, "resource:a", fetcher);

    expect(shared).toBe(result);
    expect(Object.isFrozen(shared)).toBe(true);
    expect(Object.isFrozen((shared as typeof result).items)).toBe(true);
    expect(() => {
      (shared as typeof result).items.push("b");
    }).toThrow();
  });
});
