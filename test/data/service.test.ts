import { describe, expect, it } from "vitest";
import { getServiceCallEntityIds } from "../../src/data/service";

describe("getServiceCallEntityIds", () => {
  it("returns an empty list when no entities are targeted", () => {
    expect(getServiceCallEntityIds()).toEqual([]);
    expect(getServiceCallEntityIds({ brightness: 50 }, {})).toEqual([]);
    expect(getServiceCallEntityIds({}, { area_id: "kitchen" })).toEqual([]);
  });

  it("reads a single entity from target or service data", () => {
    expect(getServiceCallEntityIds({}, { entity_id: "light.a" })).toEqual([
      "light.a",
    ]);
    expect(getServiceCallEntityIds({ entity_id: "light.a" })).toEqual([
      "light.a",
    ]);
  });

  it("prefers the target over the legacy service data entity ids", () => {
    expect(
      getServiceCallEntityIds(
        { entity_id: ["light.a", "light.b"] },
        { entity_id: ["light.b", "light.c"] }
      )
    ).toEqual(["light.b", "light.c"]);
  });

  it("deduplicates entity ids", () => {
    expect(
      getServiceCallEntityIds({}, { entity_id: ["light.a", "light.a"] })
    ).toEqual(["light.a"]);
  });

  it("splits comma separated ids and lowercases them like Core does", () => {
    expect(
      getServiceCallEntityIds({}, { entity_id: "Light.A, light.b ,light.a" })
    ).toEqual(["light.a", "light.b"]);
  });

  it("ignores wildcard, malformed, and non-string entity ids", () => {
    expect(getServiceCallEntityIds({ entity_id: "all" })).toEqual([]);
    expect(
      getServiceCallEntityIds(
        {},
        { entity_id: ["all", "none", "", "light", 5] as unknown as string[] }
      )
    ).toEqual([]);
  });
});
