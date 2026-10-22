import { describe, expect, it } from "vitest";

import {
  scriptsFilterQueryParamConfig,
  scriptsFilterQueryParams,
  scriptsFilterQueryString,
  scriptsLinkFromUrl,
} from "../../../src/common/url/scripts-query-params";
import { createQueryString } from "../../../src/common/url/query-params";

const filter = (value: string[] | Record<string, string[]> | undefined) => ({
  value,
  items: undefined,
});

describe("scripts query params", () => {
  it("reads nothing without table params", () => {
    expect(scriptsLinkFromUrl("?historyBack=1")).toBeUndefined();
  });

  it("replaces every filter and the search with what a link asks for", () => {
    expect(scriptsLinkFromUrl("?blueprint=abc")).toEqual({
      search: "",
      filters: {
        "ha-filter-floor-areas": filter(undefined),
        "ha-filter-devices": filter([]),
        "ha-filter-entities": filter([]),
        "ha-filter-labels": filter([]),
        "ha-filter-categories": filter([]),
        "ha-filter-voice-assistants": filter([]),
        "ha-filter-blueprints": filter(["abc"]),
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
      "ha-filter-blueprints": filter(["confirmable_notification.yaml"]),
    };

    expect(
      scriptsLinkFromUrl(
        createQueryString(
          scriptsFilterQueryParams(filters),
          scriptsFilterQueryParamConfig
        )
      )
    ).toEqual({ search: "", filters });
  });

  it("compares the same filters in another order as equal", () => {
    expect(
      scriptsFilterQueryString({ "ha-filter-labels": filter(["b", "a"]) })
    ).toBe(
      scriptsFilterQueryString({ "ha-filter-labels": filter(["a", "b"]) })
    );
    expect(scriptsFilterQueryString({ "ha-filter-labels": filter([]) })).toBe(
      scriptsFilterQueryString({})
    );
  });

  it("keeps one category, as the category filter picks one", () => {
    expect(
      scriptsLinkFromUrl("?category=a,b")?.filters["ha-filter-categories"]
    ).toEqual(filter(["a"]));
  });
});
