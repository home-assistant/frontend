import { describe, expect, it } from "vitest";

import {
  scenesFilterQueryParamConfig,
  scenesFilterQueryParams,
  scenesFilterQueryString,
  scenesLinkFromUrl,
} from "../../../src/common/url/scenes-query-params";
import { createQueryString } from "../../../src/common/url/query-params";

const filter = (value: string[] | Record<string, string[]> | undefined) => ({
  value,
  items: undefined,
});

describe("scenes query params", () => {
  it("reads nothing without table params", () => {
    expect(scenesLinkFromUrl("?historyBack=1")).toBeUndefined();
  });

  it("replaces every filter and the search with what a link asks for", () => {
    expect(scenesLinkFromUrl("?area=kitchen")).toEqual({
      search: "",
      filters: {
        "ha-filter-floor-areas": filter({ floors: [], areas: ["kitchen"] }),
        "ha-filter-devices": filter([]),
        "ha-filter-entities": filter([]),
        "ha-filter-labels": filter([]),
        "ha-filter-categories": filter([]),
        "ha-filter-voice-assistants": filter([]),
      },
    });
  });

  it("round trips the filters", () => {
    const filters = {
      "ha-filter-floor-areas": filter({ floors: ["ground"], areas: ["hall"] }),
      "ha-filter-devices": filter(["a", "b"]),
      "ha-filter-entities": filter(["light.hall"]),
      "ha-filter-labels": filter(["test"]),
      "ha-filter-categories": filter(["cat"]),
      "ha-filter-voice-assistants": filter(["conversation"]),
    };

    expect(
      scenesLinkFromUrl(
        createQueryString(
          scenesFilterQueryParams(filters),
          scenesFilterQueryParamConfig
        )
      )
    ).toEqual({ search: "", filters });
  });

  it("compares the same filters in another order as equal", () => {
    expect(
      scenesFilterQueryString({ "ha-filter-labels": filter(["b", "a"]) })
    ).toBe(scenesFilterQueryString({ "ha-filter-labels": filter(["a", "b"]) }));
    expect(scenesFilterQueryString({ "ha-filter-labels": filter([]) })).toBe(
      scenesFilterQueryString({})
    );
  });

  it("keeps one category, as the category filter picks one", () => {
    expect(
      scenesLinkFromUrl("?category=a,b")?.filters["ha-filter-categories"]
    ).toEqual(filter(["a"]));
  });
});
