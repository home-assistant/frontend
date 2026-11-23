import { describe, expect, it } from "vitest";
import { csvSafeString } from "../../src/util/csv";

describe("csvSafeString", () => {
  it("returns an empty string for empty or missing values", () => {
    expect(csvSafeString(undefined)).toBe("");
    expect(csvSafeString("")).toBe("");
  });

  it("returns plain values unchanged", () => {
    expect(csvSafeString("light.kitchen")).toBe("light.kitchen");
  });

  it("quotes values containing a comma", () => {
    expect(csvSafeString("on, off")).toBe('"on, off"');
  });

  it("quotes values containing a quote and escapes it", () => {
    expect(csvSafeString('say "hi"')).toBe('"say ""hi"""');
  });

  it.each([
    ["line feed", "first\nsecond"],
    ["carriage return", "first\rsecond"],
    ["carriage return and line feed", "first\r\nsecond"],
  ])("quotes values containing a %s", (_name, value) => {
    expect(csvSafeString(value)).toBe(`"${value}"`);
  });
});
