import { describe, expect, it } from "vitest";

import {
  countActiveFilters,
  filtersMatchUnassignedItem,
  listFilterEventValue,
  matchesListFilter,
} from "../../src/data/data_table_filters";

// Every config table filters labels and categories with these.
describe("matchesListFilter", () => {
  it("lets every item pass without a selection", () => {
    expect(matchesListFilter(undefined, ["a"])).toBe(true);
    expect(matchesListFilter({ ids: [], none: false }, [])).toBe(true);
  });

  it("matches the items with one of the selected ids", () => {
    const value = { ids: ["a", "b"] };
    expect(matchesListFilter(value, ["b", "c"])).toBe(true);
    expect(matchesListFilter(value, ["c"])).toBe(false);
    expect(matchesListFilter(value, [])).toBe(false);
  });

  it("matches the items without any for the none option", () => {
    const value = { ids: ["a"], none: true };
    expect(matchesListFilter(value, [])).toBe(true);
    expect(matchesListFilter(value, undefined)).toBe(true);
    expect(matchesListFilter(value, [undefined])).toBe(true);
    expect(matchesListFilter(value, ["a"])).toBe(true);
    expect(matchesListFilter(value, ["b"])).toBe(false);
  });

  it("still reads a plain list of ids", () => {
    expect(matchesListFilter(["a"], ["a"])).toBe(true);
    expect(matchesListFilter(["a"], ["b"])).toBe(false);
  });
});

// Filters send a plain list when "No …" isn't picked, which stored filters and
// links from before it still hold.
describe("listFilterEventValue", () => {
  it("sends a plain list without No …", () => {
    expect(listFilterEventValue({ ids: ["a"] })).toEqual(["a"]);
  });

  it("sends the value with No …", () => {
    expect(listFilterEventValue({ ids: ["a"], none: true })).toEqual({
      ids: ["a"],
      none: true,
    });
  });

  it("sends nothing without a selection", () => {
    expect(listFilterEventValue({ ids: [], none: false })).toBeUndefined();
  });
});

describe("countActiveFilters", () => {
  it("counts the filters with a selection", () => {
    expect(
      countActiveFilters([
        { ids: [], none: true },
        { floors: [], areas: [], no_area: false },
        ["a"],
        [],
        undefined,
      ])
    ).toBe(2);
  });
});

describe("filtersMatchUnassignedItem", () => {
  it("matches when no filter has a selection", () => {
    expect(filtersMatchUnassignedItem({})).toBe(true);
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-labels": [],
        "ha-filter-devices": undefined,
        "ha-filter-floor-areas": {},
      })
    ).toBe(true);
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-floor-areas": { areas: [], floors: [], no_area: false },
      })
    ).toBe(true);
  });

  it("matches a No area selection, also next to selected areas", () => {
    expect(
      filtersMatchUnassignedItem({ "ha-filter-floor-areas": { no_area: true } })
    ).toBe(true);
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-floor-areas": { areas: ["kitchen"], no_area: true },
      })
    ).toBe(true);
  });

  it("matches a No … selection of a list filter, also next to selected ids", () => {
    expect(
      filtersMatchUnassignedItem({ "ha-filter-labels": { none: true } })
    ).toBe(true);
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-labels": { ids: ["energy"], none: true },
      })
    ).toBe(true);
  });

  it("leaves the item out when an id is selected", () => {
    expect(filtersMatchUnassignedItem({ "ha-filter-labels": ["energy"] })).toBe(
      false
    );
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-floor-areas": { floors: ["ground"] },
      })
    ).toBe(false);
  });

  it("needs every filter to match", () => {
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-floor-areas": { no_area: true },
        "ha-filter-categories": ["lights"],
      })
    ).toBe(false);
  });
});
