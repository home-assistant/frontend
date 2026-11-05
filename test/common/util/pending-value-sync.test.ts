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

  it("skips state updates while the service call is in flight and keeps the local value afterwards", async () => {
    const sync = new PendingValueSync();
    const call = deferred();
    const resync = vi.fn();

    sync.schedule();
    const run = sync.run(() => call.promise, resync);

    expect(sync.shouldSync()).toBe(false);

    call.resolve();
    await run;

    expect(resync).not.toHaveBeenCalled();
    expect(sync.pending).toBe(false);
    expect(sync.shouldSync()).toBe(true);
  });

  it("does not restore the confirmation of a previous call after the next call succeeds", async () => {
    const sync = new PendingValueSync();
    const second = deferred();
    const resync = vi.fn();

    // First tap is sent and succeeds
    sync.schedule();
    await sync.run(() => Promise.resolve(), resync);

    // Second tap: the confirmation of the first call arrives during the
    // debounce and while the second call is in flight
    sync.schedule();
    expect(sync.shouldSync()).toBe(false);
    const run = sync.run(() => second.promise, resync);
    expect(sync.shouldSync()).toBe(false);

    // The second call resolves before the integration writes its new state
    second.resolve();
    await run;

    expect(resync).not.toHaveBeenCalled();
  });

  it("keeps a new change when the previous call finishes", async () => {
    const sync = new PendingValueSync();
    const call = deferred();
    const resync = vi.fn();

    sync.schedule();
    const run = sync.run(() => call.promise, resync);

    // The user changes the value again while the first call is in flight
    sync.schedule();

    call.resolve();
    await run;

    expect(sync.shouldSync()).toBe(false);

    await sync.run(() => Promise.resolve(), resync);

    expect(resync).not.toHaveBeenCalled();
    expect(sync.shouldSync()).toBe(true);
  });

  it("detaches calls in flight on reset", async () => {
    const sync = new PendingValueSync();
    const call = deferred();
    const resync = vi.fn();

    sync.schedule();
    sync.reset();

    expect(sync.pending).toBe(false);

    // Switching entities while a call for the previous one is in flight
    sync.schedule();
    const run = sync.run(() => call.promise, resync);
    sync.reset();

    expect(sync.pending).toBe(false);
    expect(sync.shouldSync()).toBe(true);

    // A change for the new entity is not overwritten by the old call failing
    sync.schedule();
    call.reject(new Error("failed"));
    await run;

    expect(resync).not.toHaveBeenCalled();
    expect(sync.pending).toBe(true);
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

  it("does not resync a failed call when a new change is scheduled", async () => {
    const sync = new PendingValueSync();
    const call = deferred();
    const resync = vi.fn();

    sync.schedule();
    const run = sync.run(() => call.promise, resync);
    sync.schedule();

    call.reject(new Error("failed"));
    await run;

    expect(resync).not.toHaveBeenCalled();
    expect(sync.pending).toBe(true);
  });

  it("does not let a superseded call failure resync the newer change", async () => {
    const sync = new PendingValueSync();
    const first = deferred();
    const resync = vi.fn();

    sync.schedule();
    const firstRun = sync.run(() => first.promise, resync);
    sync.schedule();
    await sync.run(() => Promise.resolve(), resync);

    // The older call fails after the newer one already succeeded
    first.reject(new Error("failed"));
    await firstRun;

    expect(resync).not.toHaveBeenCalled();
  });
});
