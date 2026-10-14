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
