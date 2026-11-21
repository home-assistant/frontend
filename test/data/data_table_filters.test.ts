import { describe, expect, it } from "vitest";

import {
  countActiveFilters,
  filterModeChanged,
  matchesFilterItems,
  matchesListFilter,
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
