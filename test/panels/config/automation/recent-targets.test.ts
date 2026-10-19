import { describe, expect, it } from "vitest";
import {
  addRecentTarget,
  parseRecentTarget,
} from "../../../../src/panels/config/automation/target/recent_targets";

describe("parseRecentTarget", () => {
  it("works", () => {
    expect(parseRecentTarget("area________kitchen")).toEqual([
      "area",
      "kitchen",
    ]);
    expect(parseRecentTarget(null)).toBeUndefined();
    expect(parseRecentTarget("device________")).toBeUndefined();
    expect(parseRecentTarget("entity_light________")).toBeUndefined();
  });
});

describe("addRecentTarget", () => {
  it("works", () => {
    expect(
      addRecentTarget(["area________kitchen"], { entity_id: "light.a" })
    ).toEqual(["entity________light.a", "area________kitchen"]);
    expect(addRecentTarget(undefined, { floor_id: "ground" })).toEqual([
      "floor________ground",
    ]);
  });
});
