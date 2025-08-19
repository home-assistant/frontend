import { describe, expect, it } from "vitest";
import { stripPrefixFromEntityName } from "../../../src/common/entity/strip_prefix_from_entity_name";

describe("stripPrefixFromEntityName", () => {
  // Original functionality tests
  it("strips prefix with space suffix", () => {
    expect(stripPrefixFromEntityName("Kitchen Light", "Kitchen")).toBe("Light");
  });

  it("strips prefix with colon suffix", () => {
    expect(stripPrefixFromEntityName("Kitchen: Light", "Kitchen")).toBe(
      "Light"
    );
  });

  it("returns undefined if no prefix match", () => {
    expect(
      stripPrefixFromEntityName("Kitchen Light", "Bedroom")
    ).toBeUndefined();
  });

  // Bug fix tests - the main issue from #25363
  it("handles undefined entityName (fixes #25363)", () => {
    expect(stripPrefixFromEntityName(undefined, "Kitchen")).toBeUndefined();
  });

  it("handles null entityName", () => {
    expect(stripPrefixFromEntityName(null as any, "Kitchen")).toBeUndefined();
  });

  it("handles undefined prefix by returning original entityName", () => {
    expect(stripPrefixFromEntityName("Kitchen Light", undefined as any)).toBe(
      "Kitchen Light"
    );
  });

  it("handles empty string prefix by returning original entityName", () => {
    expect(stripPrefixFromEntityName("Kitchen Light", "")).toBe(
      "Kitchen Light"
    );
  });
});
