import { describe, expect, it } from "vitest";

import {
  floorAreaItemSets,
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

// A ticked floor and its ticked areas must match the same, and an automation
// that targets a floor acts on each of its areas.
describe("floorAreaLookups", () => {
  it("looks up the areas of a picked floor", () => {
    expect(
      floorAreaLookups({ floors: ["ground"], areas: [] }, FLOOR_AREAS, false)
    ).toEqual({ areas: ["kitchen", "living_room", "hall"], floors: [] });
  });

  it("looks up a floor without areas itself", () => {
    expect(floorAreaLookups({ floors: ["attic"] }, FLOOR_AREAS, false)).toEqual(
      { areas: [], floors: ["attic"] }
    );
  });

  it("also looks up the floors of the picks for floor references", () => {
    expect(floorAreaLookups({ areas: ["kitchen"] }, FLOOR_AREAS, true)).toEqual(
      {
        areas: ["kitchen", "living_room", "hall"],
        floors: ["ground"],
      }
    );
  });
});

describe("floorAreaItemSets", () => {
  // automation.floor targets the ground floor itself
  const related = {
    areas: {
      kitchen: ["automation.kitchen", "automation.both"],
      living_room: ["automation.both"],
      hall: [],
      bedroom: ["automation.bedroom"],
    },
    floors: {
      ground: ["automation.kitchen", "automation.both", "automation.floor"],
      attic: ["automation.attic"],
    },
  };

  it("counts what targets a floor for each of its areas", () => {
    expect(
      floorAreaItemSets({ areas: ["kitchen", "bedroom"] }, FLOOR_AREAS, related)
    ).toEqual([
      ["automation.kitchen", "automation.both", "automation.floor"],
      ["automation.bedroom"],
    ]);
  });

  it("matches the same for a floor and all its areas", () => {
    expect(
      floorAreaItemSets({ floors: ["ground"] }, FLOOR_AREAS, related)
    ).toEqual(
      floorAreaItemSets(
        { areas: ["kitchen", "living_room", "hall"] },
        FLOOR_AREAS,
        related
      )
    );
  });

  it("uses what targets a floor without areas", () => {
    expect(
      floorAreaItemSets({ floors: ["attic"] }, FLOOR_AREAS, related)
    ).toEqual([["automation.attic"]]);
  });
});
