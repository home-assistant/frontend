import { describe, expect, it } from "vitest";

import {
  countActiveFilters,
  filterModeChanged,
  filtersMatchUnassignedItem,
  listFilterEventValue,
  matchesFilterItems,
  matchesListFilter,
  setListFilterAll,
  toggleListFilterIds,
  toggleListFilterNone,
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

  it("matches the items with every selected id when matching all", () => {
    const value = { ids: ["a", "b"], all: true };
    expect(matchesListFilter(value, ["a", "b", "c"])).toBe(true);
    expect(matchesListFilter(value, ["a"])).toBe(false);
    expect(matchesListFilter(value, [])).toBe(false);
  });

  it("matches the items without any for only the none option when matching all", () => {
    expect(matchesListFilter({ ids: [], none: true, all: true }, [])).toBe(
      true
    );
    expect(matchesListFilter({ ids: [], none: true, all: true }, ["a"])).toBe(
      false
    );
    // An item can't have none and some at once
    expect(matchesListFilter({ ids: ["a"], none: true, all: true }, [])).toBe(
      false
    );
  });

  it("shows exactly the items matching all hides when excluding", () => {
    const include = { ids: ["a", "b"], all: true };
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

describe("listFilterEventValue", () => {
  it("sends only including some ids as a plain list", () => {
    expect(listFilterEventValue({ ids: ["a"] })).toEqual(["a"]);
    expect(listFilterEventValue({ ids: ["a"], all: true })).toEqual({
      ids: ["a"],
      all: true,
    });
  });

  it("keeps the modes without a selection", () => {
    expect(listFilterEventValue({ ids: [] })).toBeUndefined();
    expect(listFilterEventValue({ ids: [], all: true })).toEqual({
      all: true,
    });
    expect(listFilterEventValue({ ids: [], exclude: true, all: true })).toEqual(
      { exclude: true, all: true }
    );
  });
});

// An item can't have none and some at once, so while matching all, the none
// option and the ids untick each other instead of matching nothing.
describe("toggling a list filter", () => {
  it("ticks and unticks ids, keeping the none option when matching any", () => {
    expect(
      toggleListFilterIds({ ids: ["a"], none: true }, ["b"], true)
    ).toEqual({ ids: ["a", "b"], none: true });
    expect(toggleListFilterIds({ ids: ["a", "b"] }, ["a", "b"], false)).toEqual(
      { ids: [] }
    );
    expect(toggleListFilterNone({ ids: ["a"] }, true)).toEqual({
      ids: ["a"],
      none: true,
    });
  });

  it("unticks the other side when matching all", () => {
    expect(
      toggleListFilterIds({ ids: [], none: true, all: true }, ["a"], true)
    ).toEqual({ ids: ["a"], none: false, all: true });
    expect(toggleListFilterNone({ ids: ["a"], all: true }, true)).toEqual({
      ids: [],
      none: true,
      all: true,
    });
  });

  it("keeps the ids when switching to matching all", () => {
    expect(setListFilterAll({ ids: ["a"], none: true }, true)).toEqual({
      ids: ["a"],
      none: false,
      all: true,
    });
    expect(setListFilterAll({ ids: [], none: true }, true)).toEqual({
      ids: [],
      none: true,
      all: true,
    });
    expect(setListFilterAll({ ids: ["a"], all: true }, false)).toEqual({
      ids: ["a"],
      all: false,
    });
  });
});

// Pages store a filter only when the URL changes, which a mode without a
// selection doesn't do, so they also store a change of mode.
describe("filterModeChanged", () => {
  it("sees a mode switched on or off, with or without a selection", () => {
    expect(filterModeChanged({ all: true }, undefined)).toBe(true);
    expect(filterModeChanged(undefined, { exclude: true })).toBe(true);
    expect(
      filterModeChanged({ ids: ["a"], all: true }, { ids: ["a"], all: false })
    ).toBe(true);
    expect(
      filterModeChanged({ areas: ["hall"] }, { areas: ["hall"], exclude: true })
    ).toBe(true);
  });

  it("ignores a change of selection, or the same value sent again", () => {
    expect(filterModeChanged(["a"], ["a", "b"])).toBe(false);
    expect(
      filterModeChanged({ ids: ["a"], all: true }, { ids: ["b"], all: true })
    ).toBe(false);
    expect(filterModeChanged(undefined, undefined)).toBe(false);
  });
});

describe("countActiveFilters", () => {
  it("doesn't count a mode without a selection", () => {
    expect(
      countActiveFilters([
        { exclude: true },
        { all: true },
        { ids: [], none: true },
        { floors: [], areas: [], no_area: false, exclude: true },
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

// Without shows exactly what With hides, also for an item with nothing
// assigned, and matching all needs every pick to match it.
describe("filtersMatchUnassignedItem with modes", () => {
  it("keeps an item without labels when a label is set to Without", () => {
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-labels": { ids: ["energy"], exclude: true },
      })
    ).toBe(true);
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-labels": { ids: [], none: true, exclude: true },
      })
    ).toBe(false);
  });

  it("only matches No area when matching all with nothing else picked", () => {
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-floor-areas": { no_area: true, all: true },
      })
    ).toBe(true);
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-floor-areas": {
          areas: ["kitchen"],
          no_area: true,
          all: true,
        },
      })
    ).toBe(false);
    expect(
      filtersMatchUnassignedItem({
        "ha-filter-floor-areas": { areas: ["kitchen"], exclude: true },
      })
    ).toBe(true);
  });
});
