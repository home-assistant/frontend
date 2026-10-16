import { afterEach, describe, expect, it, vi } from "vitest";

import { executeDebugConsole } from "../../src/data/debug_console";
import type { HomeAssistant } from "../../src/types";

const createHass = (userId: string) => {
  const callWS = vi.fn().mockResolvedValue({});
  return {
    hass: { callWS, user: { id: userId } } as unknown as HomeAssistant,
    callWS,
  };
};

const sessionIdOf = (callWS: ReturnType<typeof vi.fn>) =>
  callWS.mock.calls[0][0].session_id;

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("debug console session", () => {
  it("uses one session per user", async () => {
    const first = createHass("alice");
    const again = createHass("alice");
    const other = createHass("bob");

    await executeDebugConsole(first.hass, "1");
    await executeDebugConsole(again.hass, "1");
    await executeDebugConsole(other.hass, "1");

    expect(sessionIdOf(again.callWS)).toBe(sessionIdOf(first.callWS));
    expect(sessionIdOf(other.callWS)).not.toBe(sessionIdOf(first.callWS));
  });

  it("stores the session, so a reload continues it", async () => {
    const { hass, callWS } = createHass("carol");

    await executeDebugConsole(hass, "1");

    expect(
      window.sessionStorage.getItem("tools-debug-console-session-carol")
    ).toBe(sessionIdOf(callWS));
  });

  it("works without storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage is blocked");
    });
    const { hass, callWS } = createHass("dave");

    await executeDebugConsole(hass, "1");

    expect(sessionIdOf(callWS)).toEqual(expect.any(String));
  });
});

describe("debug console sessions across tabs", () => {
  // Each import is a tab of its own, sharing the session storage of the test.
  const openTab = async () => {
    vi.resetModules();
    return import("../../src/data/debug_console");
  };

  it("starts its own session in a tab opened from another one", async () => {
    const original = await openTab();
    const first = createHass("erin");
    await original.executeDebugConsole(first.hass, "1");

    // A tab opened from the original one gets a copy of its session storage.
    const copy = await openTab();
    const second = createHass("erin");
    await copy.executeDebugConsole(second.hass, "1");

    expect(sessionIdOf(second.callWS)).not.toBe(sessionIdOf(first.callWS));
    expect(
      window.sessionStorage.getItem("tools-debug-console-session-erin")
    ).toBe(sessionIdOf(second.callWS));
  });

  it("gives one of two tabs claiming a session at once a new one", async () => {
    window.sessionStorage.setItem(
      "tools-debug-console-session-grace",
      "copied"
    );

    // Both start before either of them knows the session is in use.
    const first = await openTab();
    const second = await openTab();
    const firstHass = createHass("grace");
    const secondHass = createHass("grace");
    await Promise.all([
      first.executeDebugConsole(firstHass.hass, "1"),
      second.executeDebugConsole(secondHass.hass, "1"),
    ]);

    const sessions = [
      sessionIdOf(firstHass.callWS),
      sessionIdOf(secondHass.callWS),
    ];
    expect(sessions[0]).not.toBe(sessions[1]);
    expect(sessions).toContain("copied");
  });

  it("continues the session after a reload", async () => {
    // The tab that used it before the reload is gone.
    window.sessionStorage.setItem(
      "tools-debug-console-session-frank",
      "before-reload"
    );

    const reloaded = await openTab();
    const { hass, callWS } = createHass("frank");
    await reloaded.executeDebugConsole(hass, "1");

    expect(sessionIdOf(callWS)).toBe("before-reload");
  });
});
