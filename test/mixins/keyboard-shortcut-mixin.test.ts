import { describe, expect, it } from "vitest";
import { normalizeShortcutKey } from "../../src/mixins/keyboard-shortcut-mixin";

const key = (init: KeyboardEventInit) =>
  normalizeShortcutKey(new KeyboardEvent("keydown", init));

describe("normalizeShortcutKey", () => {
  it("works", () => {
    expect(key({ key: "y" })).toBe("y");
    expect(key({ key: "y", shiftKey: true })).toBe("Y");
    // Caps Lock produces an uppercase key without Shift, which must not
    // trigger the Shift shortcut
    expect(key({ key: "Y" })).toBe("y");
    expect(key({ key: "Escape", shiftKey: true })).toBe("Escape");
  });
});
