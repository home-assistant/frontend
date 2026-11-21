import { describe, expect, it } from "vitest";

import {
  combineItemSets,
  floorAreaLookups,
  floorSelection,
  toggleFloorArea,
} from "../../src/data/data_table_filters";

// A ticked floor stands for all its areas. These keep what the Areas filter
// shows and what it filters on in line.
const FLOOR_AREAS = {
  ground: ["kitchen", "living_room", "hall"],
  first: ["bedroom"],
  attic: [],
};

describe("floorSelection", () => {
  it("is all for a picked floor or when every area is picked", () => {
    expect(
      floorSelection({ floors: ["ground"] }, "ground", FLOOR_AREAS.ground)
    ).toBe("all");
    expect(
      floorSelection(
        { areas: ["kitchen", "living_room", "hall"] },
        "ground",
        FLOOR_AREAS.ground
      )
    ).toBe("all");
  });

  it("is some when only part of the areas are picked", () => {
    expect(
      floorSelection({ areas: ["kitchen"] }, "ground", FLOOR_AREAS.ground)
    ).toBe("some");
  });

  it("is none without picked areas, also for a floor without areas", () => {
    expect(
      floorSelection({ areas: ["bedroom"] }, "ground", FLOOR_AREAS.ground)
    ).toBe("none");
    expect(floorSelection(undefined, "attic", FLOOR_AREAS.attic)).toBe("none");
  });
});

describe("toggleFloorArea", () => {
  it("ticking a floor drops its areas, which it stands for", () => {
    expect(
      toggleFloorArea(
        { areas: ["kitchen", "bedroom"] },
        FLOOR_AREAS,
        "floors",
        "ground",
        true
      )
    ).toEqual({ floors: ["ground"], areas: ["bedroom"] });
  });

  it("unticking a floor unticks its areas", () => {
    expect(
      toggleFloorArea(
        { floors: ["ground"], areas: ["bedroom"] },
        FLOOR_AREAS,
        "floors",
        "ground",
        false
      )
    ).toEqual({ floors: [], areas: ["bedroom"] });
  });

  it("unticking an area of a ticked floor keeps its other areas", () => {
    expect(
      toggleFloorArea(
        { floors: ["ground"], no_area: true },
        FLOOR_AREAS,
        "areas",
        "kitchen",
        false
      )
    ).toEqual({ floors: [], areas: ["living_room", "hall"], no_area: true });
  });

  it("unticking an area also listed next to its ticked floor unticks it", () => {
    expect(
      toggleFloorArea(
        { floors: ["ground"], areas: ["kitchen", "bedroom"] },
        FLOOR_AREAS,
        "areas",
        "kitchen",
        false
      )
    ).toEqual({ floors: [], areas: ["bedroom", "living_room", "hall"] });
  });

  it("ticking the last area of a floor picks the floor", () => {
    expect(
      toggleFloorArea(
        { areas: ["kitchen", "living_room"] },
        FLOOR_AREAS,
        "areas",
        "hall",
        true
      )
    ).toEqual({ floors: ["ground"], areas: [] });
  });

  it("ticks and unticks an area without a floor on its own", () => {
    const ticked = toggleFloorArea(
      undefined,
      FLOOR_AREAS,
      "areas",
      "garden",
      true
    );
    expect(ticked).toEqual({ floors: [], areas: ["garden"] });
    expect(
      toggleFloorArea(ticked, FLOOR_AREAS, "areas", "garden", false)
    ).toEqual({ floors: [], areas: [] });
  });
});

// A floor is looked up whole, so what targets the floor itself is only found
// when the whole floor is picked, and a floor and all its areas match the same.
describe("floorAreaLookups", () => {
  it("looks up a picked floor as the floor", () => {
    expect(
      floorAreaLookups({ floors: ["ground"], areas: ["garden"] }, FLOOR_AREAS)
    ).toEqual({ areas: ["garden"], floors: ["ground"] });
  });

  it("looks up a floor whose areas are all picked as the floor", () => {
    expect(
      floorAreaLookups(
        { areas: ["kitchen", "living_room", "hall", "garden"] },
        FLOOR_AREAS
      )
    ).toEqual(
      floorAreaLookups({ floors: ["ground"], areas: ["garden"] }, FLOOR_AREAS)
    );
  });

  it("looks up areas picked without their whole floor on their own", () => {
    expect(
      floorAreaLookups({ areas: ["kitchen", "living_room"] }, FLOOR_AREAS)
    ).toEqual({ areas: ["kitchen", "living_room"], floors: [] });
  });

  it("doesn't look up an area again that its picked floor covers", () => {
    expect(
      floorAreaLookups({ floors: ["ground"], areas: ["kitchen"] }, FLOOR_AREAS)
    ).toEqual({ areas: [], floors: ["ground"] });
  });

  it("doesn't count a floor without areas as picked", () => {
    expect(floorAreaLookups({ areas: [] }, FLOOR_AREAS)).toEqual({
      areas: [],
      floors: [],
    });
  });
});

// The tree works the same while matching all: a floor stands for its areas,
// and only No area and the picks untick each other.
describe("floors and areas while matching all", () => {
  it("ticks a floor for its areas, as when matching any", () => {
    expect(
      floorSelection(
        { areas: ["kitchen", "living_room", "hall"], all: true },
        "ground",
        FLOOR_AREAS.ground
      )
    ).toBe("all");
    expect(
      toggleFloorArea(
        { areas: ["kitchen", "living_room"], all: true },
        FLOOR_AREAS,
        "areas",
        "hall",
        true
      )
    ).toEqual({ floors: ["ground"], areas: [], all: true });
  });

  it("keeps No area next to the areas, as both can hold for an automation", () => {
    // No area is an automation's own area, an area finds what it uses
    expect(
      toggleFloorArea(
        { no_area: true, all: true },
        FLOOR_AREAS,
        "areas",
        "hall",
        true
      )
    ).toEqual({ floors: [], areas: ["hall"], no_area: true, all: true });
    expect([
      ...combineItemSets(
        [["automation.own_area_unset"], ["automation.own_area_unset", "b"]],
        true
      ),
    ]).toEqual(["automation.own_area_unset"]);
  });
});

describe("combineItemSets", () => {
  it("joins the items of every pick, or keeps those of all of them", () => {
    const sets = [["a", "b"], new Set(["b", "c"])];
    expect([...combineItemSets(sets, false)].sort()).toEqual(["a", "b", "c"]);
    expect([...combineItemSets(sets, true)]).toEqual(["b"]);
    expect([...combineItemSets([], true)]).toEqual([]);
  });
});
