import { describe, expect, it } from "vitest";
import { capitalizeFirstLetter } from "../../../src/common/string/capitalize-first-letter";

describe("capitalizeFirstLetter", () => {
  it("uppercases the first letter", () => {
    expect(capitalizeFirstLetter("living room")).toBe("Living room");
    expect(capitalizeFirstLetter("école")).toBe("École");
  });

  it("leaves the rest of the string unchanged", () => {
    expect(capitalizeFirstLetter("kITCHEN")).toBe("KITCHEN");
  });

  it("returns an empty string unchanged", () => {
    expect(capitalizeFirstLetter("")).toBe("");
  });

  it("uppercases a first letter outside the BMP", () => {
    // DESERET SMALL LETTER LONG I -> DESERET CAPITAL LETTER LONG I
    expect(capitalizeFirstLetter("\u{10428}\u{10428}")).toBe(
      "\u{10400}\u{10428}"
    );
  });

  it("leaves a first character without case unchanged", () => {
    expect(capitalizeFirstLetter("😀 smile")).toBe("😀 smile");
    expect(capitalizeFirstLetter("1st floor")).toBe("1st floor");
  });
});
