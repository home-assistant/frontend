import { describe, expect, it } from "vitest";
import { matchSelectOptionValue } from "../../../src/components/ha-form/ha-form-select";
import type { HaFormSelectSchema } from "../../../src/components/ha-form/types";

// The backend can send non-string option values (e.g. integers from a vol.In
// schema) even though the type declares strings, so cast in the test.
const asOptions = (options: (readonly [unknown, string])[]) =>
  options as unknown as HaFormSelectSchema["options"];

describe("matchSelectOptionValue", () => {
  it("retains the numeric type of a matched option", () => {
    const options = asOptions([
      [1, "One"],
      [5, "Five"],
      [6, "Six"],
    ]);
    expect(matchSelectOptionValue(options, "5")).toBe(5);
  });

  it("matches a zero value correctly", () => {
    const options = asOptions([
      [0, "Zero"],
      [1, "One"],
    ]);
    expect(matchSelectOptionValue(options, "0")).toBe(0);
  });

  it("returns string option values unchanged", () => {
    const options = asOptions([
      ["a", "A"],
      ["b", "B"],
    ]);
    expect(matchSelectOptionValue(options, "b")).toBe("b");
  });

  it("returns the value unchanged when no option matches", () => {
    const options = asOptions([["a", "A"]]);
    expect(matchSelectOptionValue(options, "missing")).toBe("missing");
  });
});
