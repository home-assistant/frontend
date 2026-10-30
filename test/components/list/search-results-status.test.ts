import { describe, expect, it } from "vitest";
import { searchResultsStatus } from "../../../src/components/list/search-results-status";
import { mockLocalize } from "../../fixtures/hass";

interface Row {
  id: string;
  // Like "Add custom item" or "Add new area", offered for any search
  action?: boolean;
}

const isResult = (row: Row) => !row.action;

describe("searchResultsStatus", () => {
  it("counts only the rows that are results", () => {
    const rows: (Row | string)[] = [
      "Lights",
      { id: "kitchen_light" },
      { id: "bedroom_light" },
      { id: "add_new", action: true },
    ];
    expect(searchResultsStatus("light", rows, isResult, mockLocalize)).toBe(
      'ui.components.combo-box.result_count: {"count":2,"term":"‘light’"}'
    );
    expect(
      searchResultsStatus(
        "garage",
        ["Lights", { id: "add_new", action: true }],
        isResult,
        mockLocalize
      )
    ).toBe('ui.components.combo-box.no_results: {"term":"‘garage’"}');
  });

  it("uses a not found label that takes the search", () => {
    expect(
      searchResultsStatus(
        "garage",
        [],
        isResult,
        mockLocalize,
        (search) => `No areas found for ‘${search}’`
      )
    ).toBe("No areas found for ‘garage’");
  });

  // A live region is only read out when its text changes.
  it("names the search, so a new search with as many results is read out", () => {
    expect(
      searchResultsStatus("bedroom", [{ id: "a" }], isResult, mockLocalize)
    ).not.toBe(
      searchResultsStatus("fan", [{ id: "b" }], isResult, mockLocalize)
    );
  });

  it("is undefined without a search", () => {
    expect(
      searchResultsStatus("", [{ id: "a" }], isResult, mockLocalize)
    ).toBeUndefined();
  });
});
