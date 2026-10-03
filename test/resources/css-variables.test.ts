import { describe, expect, it } from "vitest";
import {
  computeCssVariable,
  computeCssValue,
} from "../../src/resources/css-variables";

describe("computeCssVariable", () => {
  it("wraps a single property in var()", () => {
    expect(computeCssVariable("--primary-color")).toBe("var(--primary-color)");
  });

  it("builds a nested fallback chain in order for an array", () => {
    expect(computeCssVariable(["--a", "--b", "--c"])).toBe(
      "var(--a, var(--b, var(--c)))"
    );
  });

  it("handles a single-element array", () => {
    expect(computeCssVariable(["--only"])).toBe("var(--only)");
  });

  it("returns undefined for an empty array", () => {
    expect(computeCssVariable([])).toBeUndefined();
  });

  it("does not mutate the input array", () => {
    const props = ["--a", "--b", "--c"];
    computeCssVariable(props);
    expect(props).toEqual(["--a", "--b", "--c"]);
  });

  it("returns the same result when called repeatedly with the same array", () => {
    const props = ["--a", "--b", "--c"];
    const first = computeCssVariable(props);
    const second = computeCssVariable(props);
    expect(second).toBe(first);
  });
});

describe("computeCssValue", () => {
  const computedStyles = {
    getPropertyValue: (prop: string) =>
      ({
        "--a-color": "  red  ",
        "--b-color": "blue",
      })[prop] ?? "",
  } as CSSStyleDeclaration;

  it("returns the trimmed value of a color property", () => {
    expect(computeCssValue("--a-color", computedStyles)).toBe("red");
  });

  it("ignores properties that do not end with -color", () => {
    expect(computeCssValue("--a-size", computedStyles)).toBeUndefined();
  });

  it("returns the first resolved value from an array", () => {
    expect(
      computeCssValue(["--missing-color", "--b-color"], computedStyles)
    ).toBe("blue");
  });

  it("returns undefined when no property resolves", () => {
    expect(
      computeCssValue(
        ["--missing-color", "--also-missing-color"],
        computedStyles
      )
    ).toBeUndefined();
  });
});
