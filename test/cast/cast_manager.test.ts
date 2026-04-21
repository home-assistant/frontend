import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

interface FakeCastContext {
  setOptions: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  getCastState: ReturnType<typeof vi.fn>;
  getCurrentSession: ReturnType<typeof vi.fn>;
  requestSession: ReturnType<typeof vi.fn>;
}

describe("CastManager listener handling", () => {
  let fakeContext: FakeCastContext;

  beforeEach(() => {
    global.__DEV__ = false;

    fakeContext = {
      setOptions: vi.fn(),
      addEventListener: vi.fn(),
      getCastState: vi.fn(() => "NO_DEVICES_AVAILABLE"),
      getCurrentSession: vi.fn(() => ({
        addMessageListener: vi.fn(),
        sendMessage: vi.fn(),
      })),
      requestSession: vi.fn(),
    };

    (global as any).chrome = {
      cast: {
        AutoJoinPolicy: {
          ORIGIN_SCOPED: "ORIGIN_SCOPED",
        },
      },
    };

    (global as any).cast = {
      framework: {
        CastContextEventType: {
          SESSION_STATE_CHANGED: "SESSION_STATE_CHANGED",
          CAST_STATE_CHANGED: "CAST_STATE_CHANGED",
        },
        CastContext: {
          getInstance: () => fakeContext,
        },
      },
    };
  });

  afterEach(() => {
    delete (global as any).cast;
    delete (global as any).chrome;
  });

  it("removes only the unsubscribed listener", async () => {
    const { CastManager: castManagerClass } =
      await import("../../src/cast/cast_manager");
    const manager = new castManagerClass();
    const calls: string[] = [];

    const unsubscribeA = manager.addEventListener("state-changed", () => {
      calls.push("a");
    });
    const unsubscribeB = manager.addEventListener("state-changed", () => {
      calls.push("b");
    });
    const unsubscribeC = manager.addEventListener("state-changed", () => {
      calls.push("c");
    });

    unsubscribeB();
    (manager as any)._fireEvent("state-changed");

    assert.deepEqual(calls, ["a", "c"]);

    unsubscribeA();
    unsubscribeC();
  });

  it("ignores repeated unsubscribe calls", async () => {
    const { CastManager: castManagerClass } =
      await import("../../src/cast/cast_manager");
    const manager = new castManagerClass();
    const listener = vi.fn();

    const unsubscribe = manager.addEventListener(
      "connection-changed",
      listener
    );

    unsubscribe();
    unsubscribe();

    (manager as any)._fireEvent("connection-changed");

    assert.strictEqual(listener.mock.calls.length, 0);
  });
});
