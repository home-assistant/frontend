import { describe, expect, it } from "vitest";
import { getRowNote } from "../../src/data/automation";

describe("getRowNote", () => {
  it("returns the trimmed note", () => {
    expect(getRowNote("  Turn off at night  ")).toBe("Turn off at night");
  });

  it("returns undefined for a missing or blank note", () => {
    expect(getRowNote(undefined)).toBeUndefined();
    expect(getRowNote("   ")).toBeUndefined();
  });

  it("ignores non-string notes from YAML instead of throwing", () => {
    expect(getRowNote(123)).toBeUndefined();
    expect(getRowNote(true)).toBeUndefined();
    expect(getRowNote(null)).toBeUndefined();
    expect(getRowNote({ text: "note" })).toBeUndefined();
  });
});
