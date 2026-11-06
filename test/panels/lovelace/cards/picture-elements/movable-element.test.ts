import { describe, expect, it } from "vitest";
import { isMovableElement } from "../../../../../src/panels/lovelace/cards/picture-elements/movable-element";

// Styles as YAML can produce them, not only strings.
const styled = (style: Record<string, unknown>) =>
  isMovableElement({ type: "icon", style: style as Record<string, string> });

describe("isMovableElement", () => {
  it.each([
    [{}],
    [{ left: "10%", top: "20.5%" }],
    [{ left: " -5% ", top: ".5%" }],
    [{ left: 0, top: null }],
    [{ position: "Absolute" }],
    [{ transform: "translate(-50%, -50%)" }],
  ])("moves an element styled %j", (style) => {
    expect(styled(style)).toBe(true);
  });

  it.each([
    [{ position: "relative" }],
    [{ right: "5%" }],
    [{ bottom: 0 }],
    [{ inset: "0" }],
    [{ "inset-inline-start": "10%" }],
    [{ left: "120px" }],
    [{ top: "calc(50% - 10px)" }],
    [{ Left: "10%" }],
  ])("leaves an element styled %j alone", (style) => {
    expect(styled(style)).toBe(false);
  });

  it.each([["left: 10%"], [["10%"]]])(
    "leaves an element with a malformed style %j alone",
    (style) => {
      expect(isMovableElement({ type: "icon", style: style as never })).toBe(
        false
      );
    }
  );

  it("never moves a conditional", () => {
    expect(isMovableElement({ type: "conditional" })).toBe(false);
  });
});
