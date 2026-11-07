import { describe, expect, it } from "vitest";
import { getActionType } from "../../src/data/script";
import type { Action } from "../../src/data/script";

describe("getActionType", () => {
  it.each([
    ["light.turn_on", "service"],
    ["notify.send_message", "notify"],
    ["notify.mobile_app_jans_iphone", "notify"],
    // notify.reload is a plain service call, not a message to send
    ["notify.reload", "service"],
  ])("classifies action %s as %s", (action, expected) => {
    expect(getActionType({ action } as Action)).toBe(expected);
  });

  it("classifies the legacy service key the same way", () => {
    expect(getActionType({ service: "notify.mobile_app_x" } as Action)).toBe(
      "notify"
    );
    expect(getActionType({ service: "light.turn_on" } as Action)).toBe(
      "service"
    );
  });
});
