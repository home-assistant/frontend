import { describe, expect, it } from "vitest";

import {
  countActiveFilters,
  filterModeChanged,
  matchesFilterItems,
  filtersMatchUnassignedItem,
  matchesListFilter,
  sameFilterValue,
  sameListFilterValue,
} from "../../src/data/data_table_filters";

// Every config table filters labels and categories with these, and areas and
// devices through the items their filters found. Excluding has to show
// exactly the items including hides, or rows go missing from both.
describe("matchesListFilter", () => {
  it("lets every item pass without a selection", () => {
    expect(matchesListFilter(undefined, ["a"])).toBe(true);
    expect(matchesListFilter({ exclude: true }, ["a"])).toBe(true);
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

  it("shows exactly the items including hides when excluding", () => {
    const include = { ids: ["a"], none: true };
    const exclude = { ...include, exclude: true };
    for (const ids of [[], ["a"], ["b"], ["a", "b"], undefined]) {
      expect(matchesListFilter(exclude, ids)).toBe(
        !matchesListFilter(include, ids)
      );
    }
  });

  it("still reads a plain list of ids", () => {
    expect(matchesListFilter(["a"], ["a"])).toBe(true);
    expect(matchesListFilter(["a"], ["b"])).toBe(false);
  });
});

describe("matchesFilterItems", () => {
  it("inverts the items a filter found when excluding", () => {
    const items = new Set(["light.hall"]);
    expect(matchesFilterItems({ areas: ["hall"] }, items, "light.hall")).toBe(
      true
    );
    expect(
      matchesFilterItems(
        { areas: ["hall"], exclude: true },
        items,
        "light.hall"
      )
    ).toBe(false);
    expect(
      matchesFilterItems(
        { areas: ["hall"], exclude: true },
        items,
        "light.kitchen"
      )
    ).toBe(true);
  });
});

describe("countActiveFilters", () => {
  it("doesn't count a mode without a selection", () => {
    expect(
      countActiveFilters([
        { exclude: true },
        { ids: [], none: true },
        { floors: [], areas: [], no_area: false, exclude: true },
        ["a"],
        [],
        undefined,
      ])
    ).toBe(2);
  });
});

// Pages store a filter for when they're opened again only when the URL
// changes, which leaves out the mode of a filter without a selection.
describe("filterModeChanged", () => {
  it("tells when the mode changes without a selection", () => {
    expect(filterModeChanged({ exclude: true }, undefined)).toBe(true);
    expect(filterModeChanged(undefined, { exclude: true })).toBe(true);
  });

  it("tells when the mode changes with a selection", () => {
    expect(filterModeChanged({ ids: ["a"], exclude: true }, ["a"])).toBe(true);
  });

  it("ignores a filter sending back the value it was given", () => {
    expect(
      filterModeChanged(
        { ids: ["a"], exclude: true },
        { ids: ["a"], exclude: true }
      )
    ).toBe(false);
    expect(filterModeChanged(["a"], ["a", "b"])).toBe(false);
    expect(filterModeChanged(undefined, undefined)).toBe(false);
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

  it("turns the match around for a Without filter", () => {
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-labels": { ids: ["energy"], exclude: true },
      })
    ).toBe(true);
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-labels": { none: true, exclude: true },
      })
    ).toBe(false);
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-floor-areas": { no_area: true, exclude: true },
      })
    ).toBe(false);
    expect(
      filtersMatchUnassignedItem({ "ha-filter-labels": { exclude: true } })
    ).toBe(true);
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

// The device, blueprint and entity filters look up their items again when
// their value changes. They send a plain list but keep an object, so the page
// binding the list back must not count as a change.
describe("sameListFilterValue", () => {
  it("treats a plain list and its object as the same", () => {
    expect(sameListFilterValue(["a", "b"], { ids: ["a", "b"] })).toBe(true);
    expect(sameListFilterValue(undefined, { ids: [] })).toBe(true);
    expect(
      sameListFilterValue({ ids: ["a"] }, { ids: ["a"], none: false })
    ).toBe(true);
  });

  it("sees a change of selection, none option or mode", () => {
    expect(sameListFilterValue(["a"], ["a", "b"])).toBe(false);
    expect(sameListFilterValue(["a"], { ids: ["a"], none: true })).toBe(false);
    expect(sameListFilterValue(["a"], { ids: ["a"], exclude: true })).toBe(
      false
    );
  });
});

// The automation, script and scene tables keep a filter's items when a link
// or stored filter gives it the same value. They have to compare as the filter
// does: a filter that sees no change doesn't look up its items again, so a
// table that drops them stops applying the filter.
describe("sameFilterValue", () => {
  it("keeps the items of only No device, however it's written", () => {
    expect(
      sameFilterValue(
        "ha-filter-devices",
        { none: true },
        { ids: [], none: true }
      )
    ).toBe(true);
    expect(sameFilterValue("ha-filter-blueprints", ["a"], { ids: ["a"] })).toBe(
      true
    );
  });

  it("compares the other filters exactly", () => {
    expect(
      sameFilterValue(
        "ha-filter-floor-areas",
        { floors: ["ground"] },
        { floors: ["first"] }
      )
    ).toBe(false);
    expect(sameFilterValue("ha-filter-labels", ["a"], { ids: ["a"] })).toBe(
      false
    );
  });
});
