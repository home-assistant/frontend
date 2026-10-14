import { describe, expect, it } from "vitest";
import {
  addRecentTargets,
  parseRecentTarget,
} from "../../../../src/panels/config/automation/target/recent_targets";

describe("parseRecentTarget", () => {
  it("works", () => {
    expect(parseRecentTarget("area________kitchen")).toEqual([
      "area",
      "kitchen",
    ]);
    // Malformed entries and structural buckets are rejected
    expect(parseRecentTarget(null)).toBeUndefined();
    expect(parseRecentTarget("device________")).toBeUndefined();
    expect(parseRecentTarget("entity_light________")).toBeUndefined();
  });
});

describe("addRecentTargets", () => {
  it("only adds targets that are new in the changed target", () => {
    expect(
      addRecentTargets(
        ["area________kitchen"],
        { entity_id: "light.a" },
        { entity_id: ["light.a", "light.b"], area_id: "kitchen" }
      )
    ).toEqual(["entity________light.b", "area________kitchen"]);
  });

  it("keeps the list when nothing was added", () => {
    const recents = ["area________kitchen"];
    expect(
      addRecentTargets(recents, { area_id: "kitchen" }, { area_id: [] })
    ).toBe(recents);
  });

  it("skips templates and special entity ids", () => {
    expect(
      addRecentTargets(undefined, undefined, {
        entity_id: ["all", "{{ states.light | list }}"],
        floor_id: "ground",
      })
    ).toEqual(["floor________ground"]);
  });
});
