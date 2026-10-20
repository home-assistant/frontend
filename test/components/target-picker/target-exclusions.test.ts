import { describe, expect, it } from "vitest";
import {
  addToExclude,
  computeExclusionsPerTarget,
  removeFromExclude,
  targetItems,
  withExclude,
} from "../../../src/components/target-picker/target-exclusions";

describe("targetItems", () => {
  it("lists what a target includes, not what it excludes", () => {
    expect(
      targetItems({
        entity_id: "light.a",
        area_id: ["kitchen", "hallway"],
        // @ts-expect-error exclude is not part of a plain target
        exclude: { device_id: "tv" },
      })
    ).toEqual([
      { type: "entity", id: "light.a" },
      { type: "area", id: "kitchen" },
      { type: "area", id: "hallway" },
    ]);
  });
});

describe("computeExclusionsPerTarget", () => {
  const kitchen = {
    type: "area" as const,
    id: "kitchen",
    entities: ["light.table", "light.main", "light.night"],
  };
  const hallway = {
    type: "area" as const,
    id: "hallway",
    entities: ["light.hall", "light.night_hall"],
  };

  it("lists an exclusion under each target it takes something out of", () => {
    const { perTarget, noEffect } = computeExclusionsPerTarget(
      [kitchen, hallway],
      [
        {
          type: "label",
          id: "nightlights",
          entities: ["light.night", "light.night_hall", "light.bedroom"],
        },
        { type: "entity", id: "light.main", entities: ["light.main"] },
      ]
    );

    // The label cuts from both areas, so it shows under both.
    expect(perTarget["area:kitchen"]).toEqual([
      {
        type: "label",
        id: "nightlights",
        removed: ["light.night"],
      },
      {
        type: "entity",
        id: "light.main",
        removed: ["light.main"],
      },
    ]);
    expect(perTarget["area:hallway"]).toEqual([
      {
        type: "label",
        id: "nightlights",
        removed: ["light.night_hall"],
      },
    ]);
    expect(noEffect).toEqual([]);
  });

  it("puts exclusions that take nothing out apart, like deleted ones", () => {
    const { perTarget, noEffect } = computeExclusionsPerTarget(
      [kitchen],
      [
        { type: "area", id: "office", entities: ["light.desk"] },
        { type: "device", id: "deleted_device", entities: [] },
      ]
    );

    expect(perTarget).toEqual({});
    expect(noEffect).toEqual([
      { type: "area", id: "office" },
      { type: "device", id: "deleted_device" },
    ]);
  });
});

describe("exclude editing", () => {
  it("adds an item once", () => {
    const exclude = addToExclude(undefined, { type: "label", id: "xmas" });
    expect(exclude).toEqual({ label_id: ["xmas"] });
    expect(addToExclude(exclude, { type: "label", id: "xmas" })).toBe(exclude);
    expect(addToExclude(exclude, { type: "area", id: "kitchen" })).toEqual({
      label_id: ["xmas"],
      area_id: ["kitchen"],
    });
  });

  it("drops empty keys and the exclude itself once it is empty", () => {
    const exclude = { label_id: "xmas", area_id: ["kitchen", "hallway"] };
    expect(removeFromExclude(exclude, { type: "label", id: "xmas" })).toEqual({
      area_id: ["kitchen", "hallway"],
    });
    expect(
      removeFromExclude({ label_id: "xmas" }, { type: "label", id: "xmas" })
    ).toBeUndefined();
  });

  it("keeps the exclude only while something is included", () => {
    expect(
      withExclude({ area_id: "kitchen" }, { entity_id: ["light.a"] })
    ).toEqual({ area_id: "kitchen", exclude: { entity_id: ["light.a"] } });
    expect(
      withExclude(
        { area_id: "kitchen", exclude: { entity_id: "light.a" } },
        undefined
      )
    ).toEqual({ area_id: "kitchen" });
    expect(
      withExclude({ exclude: { entity_id: "light.a" } }, { entity_id: "x" })
    ).toBeUndefined();
  });
});
