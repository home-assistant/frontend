import { describe, it, expect } from "vitest";
import { getTimezoneOptions } from "../../src/components/ha-timezone-picker";

describe("getTimezoneOptions", () => {
  const options = getTimezoneOptions();

  it("includes the bare UTC zone so a UTC config is recognized", () => {
    const utc = options.find((option) => option.id === "UTC");
    expect(utc).toBeDefined();
    expect(utc?.primary).toContain("UTC");
  });

  it("includes the Etc/UTC zone", () => {
    expect(options.some((option) => option.id === "Etc/UTC")).toBe(true);
  });

  it("does not duplicate any zone id", () => {
    const ids = options.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the zones from the source list", () => {
    // A sanity check that the base list is still present alongside the additions.
    expect(options.some((option) => option.id === "Europe/Amsterdam")).toBe(
      true
    );
    expect(options.length).toBeGreaterThan(100);
  });
});
