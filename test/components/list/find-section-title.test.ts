import { describe, expect, it } from "vitest";
import { findSectionTitle } from "../../../src/components/list/find-section-title";

describe("findSectionTitle", () => {
  it("works", () => {
    const items = [
      "Entities",
      { id: "a" },
      { id: "b" },
      "Devices",
      { id: "c" },
    ];
    expect(findSectionTitle(items, 1)).toBe("Entities");
    expect(findSectionTitle(items, 4)).toBe("Devices");
    expect(
      findSectionTitle(["Entities", { id: "a" }, { id: "b" }, { id: "c" }], 2)
    ).toBe("Entities");
    // A header is visible at the top or about to take its place
    expect(findSectionTitle(items, 0)).toBeUndefined();
    expect(findSectionTitle(items, 2)).toBeUndefined();
    expect(findSectionTitle(items, 3)).toBeUndefined();
    // No header above the first row, or nothing visible
    expect(findSectionTitle([{ id: "a" }, { id: "b" }], 1)).toBeUndefined();
    expect(findSectionTitle(items, 9)).toBeUndefined();
  });
});
