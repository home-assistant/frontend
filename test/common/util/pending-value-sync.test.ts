import { describe, expect, it, vi } from "vitest";

import { PendingValueSync } from "../../../src/common/util/pending-value-sync";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe("PendingValueSync", () => {
  it("syncs state when nothing is pending", () => {
    const sync = new PendingValueSync();

    expect(sync.pending).toBe(false);
    expect(sync.shouldSync()).toBe(true);
  });

  it("skips state updates while a change is scheduled", () => {
    const sync = new PendingValueSync();

    sync.schedule();

    expect(sync.pending).toBe(true);
    expect(sync.shouldSync()).toBe(false);
  });

  it("skips state updates while the service call is in flight and resyncs afterwards", async () => {
    const sync = new PendingValueSync();
    const call = deferred();
    const resync = vi.fn();

    sync.schedule();
    const run = sync.run(() => call.promise, resync);

    expect(sync.shouldSync()).toBe(false);

    call.resolve();
    await run;

    expect(resync).toHaveBeenCalledTimes(1);
    expect(sync.pending).toBe(false);
    expect(sync.shouldSync()).toBe(true);
  });

  it("does not resync when no state update was skipped", async () => {
    const sync = new PendingValueSync();
    const resync = vi.fn();

    sync.schedule();
    await sync.run(() => Promise.resolve(), resync);

    expect(resync).not.toHaveBeenCalled();
  });

  it("keeps a new change when the previous call finishes", async () => {
    const sync = new PendingValueSync();
    const call = deferred();
    const resync = vi.fn();

    sync.schedule();
    const run = sync.run(() => call.promise, resync);

    // The user changes the value again while the first call is in flight,
    // then the state update for the first call arrives.
    sync.schedule();
    expect(sync.shouldSync()).toBe(false);

    call.resolve();
    await run;

    expect(resync).not.toHaveBeenCalled();
    expect(sync.shouldSync()).toBe(false);

    await sync.run(() => Promise.resolve(), resync);

    expect(resync).toHaveBeenCalledTimes(1);
  });

  it("resyncs when the service call fails", async () => {
    const sync = new PendingValueSync();
    const call = deferred();
    const resync = vi.fn();

    sync.schedule();
    const run = sync.run(() => call.promise, resync);

    call.reject(new Error("failed"));
    await run;

    expect(resync).toHaveBeenCalledTimes(1);
    expect(sync.pending).toBe(false);
  });
});
