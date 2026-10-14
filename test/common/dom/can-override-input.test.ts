import { describe, expect, it } from "vitest";

import { canOverrideAlphanumericInput } from "../../../src/common/dom/can-override-input";

const createInput = (type: string): HTMLInputElement => {
  const input = document.createElement("input");
  input.type = type;
  return input;
};

// jsdom does not implement isContentEditable, so set it like a browser would.
const createContentEditable = (): HTMLElement => {
  const element = document.createElement("div");
  element.contentEditable = "true";
  Object.defineProperty(element, "isContentEditable", { value: true });
  return element;
};

describe("canOverrideAlphanumericInput", () => {
  it("overrides keys typed outside of text fields", () => {
    expect(canOverrideAlphanumericInput([document.createElement("div")])).toBe(
      true
    );
  });

  it("does not override keys typed in a textarea", () => {
    expect(
      canOverrideAlphanumericInput([document.createElement("textarea")])
    ).toBe(false);
  });

  it("does not override keys typed in a contenteditable element", () => {
    expect(canOverrideAlphanumericInput([createContentEditable()])).toBe(false);
  });

  it("does not override keys typed in a code editor", () => {
    expect(
      canOverrideAlphanumericInput([
        document.createElement("div"),
        document.createElement("ha-code-editor"),
      ])
    ).toBe(false);
  });

  it.each(["text", "search", "number"])(
    "does not override keys typed in a %s input",
    (type) => {
      expect(canOverrideAlphanumericInput([createInput(type)])).toBe(false);
    }
  );

  it.each(["button", "checkbox", "radio", "range"])(
    "overrides keys pressed on a %s input",
    (type) => {
      expect(canOverrideAlphanumericInput([createInput(type)])).toBe(true);
    }
  );
});
