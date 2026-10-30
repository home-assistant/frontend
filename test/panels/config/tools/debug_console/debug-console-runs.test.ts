import { describe, expect, it, vi } from "vitest";

import { DebugConsoleRuns } from "../../../../../src/panels/config/tools/debug_console/debug-console-runs";

// A run that only finishes when told to, like code awaiting an event.
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("debug console runs", () => {
  it("runs code while earlier code is still running", async () => {
    const changed = vi.fn();
    const runs = new DebugConsoleRuns(changed);
    const waiting = deferred<string>();

    const first = runs.run("await event.wait()", () => waiting.promise);
    const second = runs.run("event.set()", async () => "set");

    // The later run finishes first, and does not wait for the earlier one.
    expect(await second).toBe("set");
    expect(runs.pending.map((run) => run.code)).toEqual(["await event.wait()"]);

    waiting.resolve("done");
    expect(await first).toBe("done");
    expect(runs.pending).toEqual([]);
    expect(changed).toHaveBeenCalled();
  });

  it("keeps code running when the log is cleared, without its result", async () => {
    const runs = new DebugConsoleRuns(() => undefined);
    const waiting = deferred<string>();

    const before = runs.run("await event.wait()", () => waiting.promise);
    runs.clear();

    // Still running, so it can still be stopped.
    expect(runs.pending).toHaveLength(1);

    const after = runs.run("1 + 1", async () => "2");
    waiting.resolve("done");

    expect(await before).toBeUndefined();
    expect(await after).toBe("2");
    expect(runs.pending).toEqual([]);
  });

  it("forgets code that failed to run", async () => {
    const runs = new DebugConsoleRuns(() => undefined);
    const failing = deferred<string>();

    const run = runs.run("1", () => failing.promise);
    failing.reject(new Error("Connection lost"));

    await expect(run).rejects.toThrow("Connection lost");
    expect(runs.pending).toEqual([]);
  });
});
