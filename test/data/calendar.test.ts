import { describe, expect, test } from "vitest";
import { getCalendarColors } from "../../src/data/calendar";

const style = {
  getPropertyValue: (prop: string) => (prop === "--color-1" ? "#4269d0" : ""),
} as CSSStyleDeclaration;

describe("getCalendarColors", () => {
  test("pick dark text for a light background", () => {
    expect(getCalendarColors("#ffe066", 0, style)).toEqual({
      backgroundColor: "#ffe066",
      textColor: "#000000",
    });
  });

  test("pick light text for a dark background", () => {
    expect(getCalendarColors("#00679e", 0, style)).toEqual({
      backgroundColor: "#00679e",
      textColor: "#ffffff",
    });
  });

  test("fall back to the color for the index", () => {
    expect(getCalendarColors(undefined, 0, style)).toEqual({
      backgroundColor: "#4269d0",
      textColor: "#ffffff",
    });
  });

  test("resolve a theme color", () => {
    expect(getCalendarColors("yellow", 0, style)).toEqual({
      backgroundColor: "var(--yellow-color)",
      textColor: "#000000",
    });
  });
});
