import { describe, expect, it } from "vitest";
import { getCalendarColors } from "../../src/data/calendar";

const style = {
  getPropertyValue: (prop: string) => (prop === "--color-1" ? "#4269d0" : ""),
} as CSSStyleDeclaration;

describe("getCalendarColors", () => {
  it("picks dark text for a light background", () => {
    expect(getCalendarColors("#ffe066", 0, style)).toEqual({
      backgroundColor: "#ffe066",
      textColor: "#000000",
    });
  });

  it("picks light text for a dark background", () => {
    expect(getCalendarColors("#00679e", 0, style)).toEqual({
      backgroundColor: "#00679e",
      textColor: "#ffffff",
    });
  });

  it("falls back to the color for the index", () => {
    expect(getCalendarColors(undefined, 0, style)).toEqual({
      backgroundColor: "#4269d0",
      textColor: "#ffffff",
    });
    expect(getCalendarColors("not a color", 0, style).backgroundColor).toBe(
      "#4269d0"
    );
  });

  it("reads a theme color from the element it is rendered on", () => {
    const themed = {
      getPropertyValue: (prop: string) =>
        prop === "--blue-color" ? "#ffe066" : "",
    } as CSSStyleDeclaration;
    // Resolving against the document instead would read the named color blue
    expect(getCalendarColors("blue", 0, themed)).toEqual({
      backgroundColor: "var(--blue-color)",
      textColor: "#000000",
    });
  });

  it("leaves the text color unset for a background it cannot measure", () => {
    const empty = {
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration;
    expect(getCalendarColors(undefined, 0, empty).textColor).toBeUndefined();
    expect(
      getCalendarColors("color-mix(in srgb, white 90%, black)", 0, style)
        .textColor
    ).toBeUndefined();
    expect(
      getCalendarColors("rgba(255, 255, 255, 0.1)", 0, style).textColor
    ).toBeUndefined();
  });
});
