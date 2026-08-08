/**
 * @vitest-environment node
 */

import { setImmediate } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { ParallelTransform } from "../../build-scripts/parallel-transform.mjs";
import { run } from "./vinyl-stub.js";

const defer = () => {
  const handle = {};
  handle.promise = new Promise((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return handle;
};

describe("ParallelTransform", () => {
  it("keeps `limit` handlers in flight and no more", async () => {
    const pending = [];
    let active = 0;
    let peak = 0;

    const stream = new ParallelTransform(3, () => {
      active += 1;
      peak = Math.max(peak, active);
      const handle = defer();
      pending.push(handle);
      return handle.promise.then((result) => {
        active -= 1;
        return result;
      });
    });

    const items = Array.from({ length: 10 }, (_, index) => `item${index}`);
    const done = run(stream, items);

    await setImmediate();
    expect(pending).toHaveLength(3);

    for (let index = 0; index < items.length; index += 1) {
      pending[index].resolve(items[index]);
      // eslint-disable-next-line no-await-in-loop -- releasing one job at a time is the point
      await setImmediate();
    }

    expect(await done).toEqual(items);
    expect(peak).toBe(3);
  });

  it("emits in completion order rather than input order", async () => {
    const pending = new Map();
    const stream = new ParallelTransform(3, (item) => {
      const handle = defer();
      pending.set(item, handle);
      return handle.promise;
    });

    const done = run(stream, ["a", "b", "c"]);
    await setImmediate();

    ["c", "a", "b"].forEach((item) => pending.get(item).resolve(item));

    expect(await done).toEqual(["c", "a", "b"]);
  });

  it("drops results the handler resolves to nothing for", async () => {
    const stream = new ParallelTransform(2, async (item) =>
      item === "skip" ? undefined : item
    );

    expect(await run(stream, ["a", "skip", "b"])).toEqual(["a", "b"]);
  });

  it("fails the stream when a handler rejects", async () => {
    const stream = new ParallelTransform(2, async (item) => {
      if (item === "bad") {
        throw new Error("boom");
      }
      return item;
    });

    await expect(run(stream, ["a", "bad", "b"])).rejects.toThrow("boom");
  });

  it("does not finish until in-flight work completes", async () => {
    const handle = defer();
    let ended = false;

    const stream = new ParallelTransform(2, () => handle.promise);
    const done = run(stream, ["a"]).then((results) => {
      ended = true;
      return results;
    });

    await setImmediate();
    expect(ended).toBe(false);

    handle.resolve("a");

    expect(await done).toEqual(["a"]);
  });
});
