import { describe, expect, it } from "vitest";
import {
  elementAnchors,
  isMovableElement,
  movedStyle,
} from "../../../../../src/panels/lovelace/cards/picture-elements/movable-element";

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
    [{ right: "5%" }],
    [{ bottom: 0 }],
    [{ left: "", right: "5%", top: null, bottom: "10%" }],
    [{ Right: "", Bottom: null }],
    [{ right: "", Right: "", top: "5%" }],
    // The card removes the sides at the empty inset, before it sets them.
    [{ inset: "" }],
    [{ Inset: null, right: "5%", bottom: "10%" }],
    [{ inset: "", left: "12.3%", top: "20%" }],
  ])("moves an element styled %j", (style) => {
    expect(styled(style)).toBe(true);
  });

  it.each([
    [{ position: "relative" }],
    [{ left: "10%", right: "5%" }],
    [{ top: 0, bottom: "5%" }],
    [{ right: "5px" }],
    [{ Bottom: "5%" }],
    [{ inset: "0" }],
    [{ "inset-inline-start": "10%" }],
    [{ left: "120px" }],
    [{ top: "calc(50% - 10px)" }],
    [{ Left: "10%" }],
    [{ Top: "" }],
    // Depending on the key order, the empty key removes the side again.
    [{ right: "5%", Right: "" }],
    [{ Bottom: null, bottom: "5%" }],
    // The empty inset removes the sides again.
    [{ right: "10%", bottom: "20%", inset: "" }],
    [{ left: "10%", Inset: null }],
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

describe("elementAnchors", () => {
  it.each([
    [{}, { x: "left", y: "top" }],
    [
      { right: "5%", bottom: "10%" },
      { x: "right", y: "bottom" },
    ],
    [
      { left: "5%", bottom: "10%" },
      { x: "left", y: "bottom" },
    ],
    [
      { right: "5%", top: "10%" },
      { x: "right", y: "top" },
    ],
  ])("places an element styled %j from %j", (style, anchors) => {
    expect(elementAnchors({ type: "icon", style })).toEqual(anchors);
  });
});

describe("movedStyle", () => {
  // A spot on the image, from all of its sides.
  const SPOT = { left: 12.34, right: 87.66, top: 20, bottom: 80 };

  it.each([
    [{ color: "red" }, { color: "red", left: "12.3%", top: "20%" }],
    [
      { right: "5%", bottom: "5%" },
      { right: "87.7%", bottom: "80%" },
    ],
    [
      { left: "5%", bottom: "5%" },
      { left: "12.3%", bottom: "80%" },
    ],
    [
      { right: "5%", top: "5%" },
      { right: "87.7%", top: "20%" },
    ],
  ])("moves an element styled %j along its sides", (style, moved) => {
    expect(movedStyle({ type: "icon", style }, SPOT)).toEqual(moved);
  });

  it("leaves an element alone that it can't move there", () => {
    const style = { left: "5%", right: "5%" };
    expect(movedStyle({ type: "icon", style }, SPOT)).toBeUndefined();
    // The element no longer uses the sides the position was taken from.
    expect(
      movedStyle(
        { type: "icon", style: { right: "5%" } },
        { left: 10, top: 20 }
      )
    ).toBeUndefined();
  });
});
