import { describe, expect, it } from "vitest";
import { filtersMatchUnassignedItem } from "../../src/data/data_table_filters";

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
