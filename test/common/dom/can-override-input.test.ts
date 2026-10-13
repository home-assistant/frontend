import { describe, expect, it } from "vitest";
import { canOverrideAlphanumericInput } from "../../../src/common/dom/can-override-input";

// jsdom does not implement isContentEditable — it is undefined on every element,
// including one carrying contenteditable="true". These stubs therefore describe
// the shape the function actually reads rather than using real elements.
const stub = (props: Record<string, unknown>) =>
  props as unknown as EventTarget;

describe("canOverrideAlphanumericInput", () => {
  it("allows shortcuts on a plain element", () => {
    expect(canOverrideAlphanumericInput([stub({ tagName: "DIV" })])).toBe(true);
  });

  it("blocks shortcuts in a textarea", () => {
    expect(canOverrideAlphanumericInput([stub({ tagName: "TEXTAREA" })])).toBe(
      false
    );
  });

  it("blocks shortcuts in a text input", () => {
    expect(
      canOverrideAlphanumericInput([stub({ tagName: "INPUT", type: "text" })])
    ).toBe(false);
  });

  it("allows shortcuts on inputs that are not typed into", () => {
    for (const type of ["button", "checkbox", "hidden", "radio", "range"]) {
      expect(
        canOverrideAlphanumericInput([stub({ tagName: "INPUT", type })])
      ).toBe(true);
    }
  });

  it("blocks shortcuts in a contenteditable element", () => {
    expect(
      canOverrideAlphanumericInput([
        stub({ tagName: "DIV", isContentEditable: true }),
      ])
    ).toBe(false);
  });

  it("blocks shortcuts when a contenteditable element is the event target inside a shadow root", () => {
    expect(
      canOverrideAlphanumericInput([
        stub({ tagName: "SPAN", isContentEditable: true }),
        stub({ tagName: "DIV" }),
        stub({ tagName: "MY-CARD" }),
      ])
    ).toBe(false);
  });

  it("blocks shortcuts inside a code editor", () => {
    expect(
      canOverrideAlphanumericInput([
        stub({ tagName: "DIV" }),
        stub({ tagName: "HA-CODE-EDITOR" }),
      ])
    ).toBe(false);
  });

  it("blocks shortcuts inside a menu", () => {
    expect(
      canOverrideAlphanumericInput([
        stub({ tagName: "DIV" }),
        stub({ tagName: "HA-MENU" }),
      ])
    ).toBe(false);
  });

  it("blocks shortcuts on a select or dropdown child", () => {
    expect(
      canOverrideAlphanumericInput([
        stub({ tagName: "DIV", parentElement: { tagName: "HA-SELECT" } }),
      ])
    ).toBe(false);
    expect(
      canOverrideAlphanumericInput([
        stub({ tagName: "DIV", parentElement: { tagName: "HA-DROPDOWN" } }),
      ])
    ).toBe(false);
  });
});
