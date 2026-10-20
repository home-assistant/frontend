import { describe, expect, it } from "vitest";
import { isCompatible } from "../src/utils/version";

// Decides whether a custom card may use Home Assistant's copy of a component.
// A wrong answer either breaks cards with an incompatible copy or needlessly
// skips a compatible one.
describe("isCompatible", () => {
  it.each([
    ["1.2.0", "1.2.0", true],
    ["1.3.0", "1.2.5", true],
    ["1.2.5", "1.2.3", true],
    ["1.2.2", "1.2.3", false],
    ["1.1.9", "1.2.0", false],
    ["2.0.0", "1.2.0", false],
    ["1.2.0", "2.0.0", false],
    ["0.1.5", "0.1.0", true],
    ["0.2.0", "0.1.0", false],
    ["1.2.0-beta.1", "1.2.0", true],
    ["1.2", "1.2.0", false],
    ["latest", "1.2.0", false],
  ])("provided %s for required %s is %s", (provided, required, expected) => {
    expect(isCompatible(provided, required)).toBe(expected);
  });
});
