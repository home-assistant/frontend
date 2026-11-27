import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "../../../src/common/util/map-with-concurrency";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("mapWithConcurrency", () => {
  it("keeps the order of the items", async () => {
    const results = await mapWithConcurrency(
      [30, 10, 20],
      2,
      (delay) =>
        new Promise<number>((resolve) => {
          setTimeout(() => resolve(delay), delay);
        })
    );
    expect(results).toEqual([30, 10, 20]);
  });

  it("runs at most the limit at a time", async () => {
    const calls = Array.from({ length: 5 }, () => deferred<number>());
    const started: number[] = [];

    const result = mapWithConcurrency([0, 1, 2, 3, 4], 2, (index) => {
      started.push(index);
      return calls[index].promise;
    });

    await Promise.resolve();
    expect(started).toEqual([0, 1]);

    calls[1].resolve(1);
    await new Promise((resolve) => {
      setTimeout(resolve);
    });
    expect(started).toEqual([0, 1, 2]);

    calls[0].resolve(0);
    calls[2].resolve(2);
    calls[3].resolve(3);
    calls[4].resolve(4);
    expect(await result).toEqual([0, 1, 2, 3, 4]);
    expect(started).toEqual([0, 1, 2, 3, 4]);
  });

  it("starts no new calls after one fails", async () => {
    const started: number[] = [];

    await expect(
      mapWithConcurrency([0, 1, 2, 3], 1, async (index) => {
        started.push(index);
        if (index === 1) {
          throw new Error("failed");
        }
        return index;
      })
    ).rejects.toThrow("failed");
    expect(started).toEqual([0, 1]);
  });

  it("starts no new calls after the signal aborts", async () => {
    const calls = Array.from({ length: 4 }, () => deferred<number>());
    const started: number[] = [];
    const controller = new AbortController();

    const result = mapWithConcurrency(
      [0, 1, 2, 3],
      2,
      (index) => {
        started.push(index);
        return calls[index].promise;
      },
      controller.signal
    );
    const rejected = expect(result).rejects.toThrow();

    await Promise.resolve();
    expect(started).toEqual([0, 1]);

    controller.abort();
    calls[0].resolve(0);
    calls[1].resolve(1);
    await rejected;
    expect(started).toEqual([0, 1]);
  });

  it("rejects when the signal aborts during the last calls", async () => {
    const call = deferred<number>();
    const controller = new AbortController();

    const result = mapWithConcurrency(
      [0],
      10,
      () => call.promise,
      controller.signal
    );
    const rejected = expect(result).rejects.toThrow();

    controller.abort();
    call.resolve(0);
    await rejected;
  });

  it("handles no items", async () => {
    expect(await mapWithConcurrency([], 3, async () => 1)).toEqual([]);
  });
});
