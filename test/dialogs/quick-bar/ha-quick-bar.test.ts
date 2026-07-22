import { describe, expect, it } from "vitest";
import { supportsQuickBarAskAssist } from "../../../src/dialogs/quick-bar/supports-quick-bar-ask-assist";

describe("supportsQuickBarAskAssist", () => {
  it("shows Ask Assist on the web when conversation is loaded", () => {
    expect(supportsQuickBarAskAssist(true, false, false)).toBe(true);
  });

  it("shows Ask Assist when native prompt submission is supported", () => {
    expect(supportsQuickBarAskAssist(true, true, true)).toBe(true);
  });

  it("hides Ask Assist when native prompt submission is unsupported", () => {
    expect(supportsQuickBarAskAssist(true, true, false)).toBe(false);
  });

  it("hides Ask Assist when conversation is unavailable", () => {
    expect(supportsQuickBarAskAssist(false, false, false)).toBe(false);
  });
});
