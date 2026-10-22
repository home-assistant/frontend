import { describe, expect, it } from "vitest";

import {
  automationsFilterQueryParamConfig,
  automationsFilterQueryParams,
  automationsFilterQueryString,
  automationsLinkFromUrl,
} from "../../../src/common/url/automations-query-params";
import { createQueryString } from "../../../src/common/url/query-params";

const filter = (value: string[] | Record<string, string[]> | undefined) => ({
  value,
  items: undefined,
});

describe("automations query params", () => {
  it("reads nothing without table params", () => {
    expect(automationsLinkFromUrl("?historyBack=1")).toBeUndefined();
  });

  it("replaces every filter and the search with what a link asks for", () => {
    expect(automationsLinkFromUrl("?device=abc")).toEqual({
      search: "",
      filters: {
        "ha-filter-floor-areas": filter(undefined),
        "ha-filter-devices": filter(["abc"]),
        "ha-filter-entities": filter([]),
        "ha-filter-labels": filter([]),
        "ha-filter-categories": filter([]),
        "ha-filter-voice-assistants": filter([]),
        "ha-filter-blueprints": filter([]),
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
      "ha-filter-blueprints": filter(["motion_light.yaml"]),
    };

    expect(
      automationsLinkFromUrl(
        createQueryString(
          automationsFilterQueryParams(filters),
          automationsFilterQueryParamConfig
        )
      )
    ).toEqual({ search: "", filters });
  });

  it("compares the same filters in another order as equal", () => {
    expect(
      automationsFilterQueryString({ "ha-filter-labels": filter(["b", "a"]) })
    ).toBe(
      automationsFilterQueryString({ "ha-filter-labels": filter(["a", "b"]) })
    );
    expect(
      automationsFilterQueryString({ "ha-filter-labels": filter([]) })
    ).toBe(automationsFilterQueryString({}));
  });

  it("keeps one category, as the category filter picks one", () => {
    expect(
      automationsLinkFromUrl("?category=a,b")?.filters["ha-filter-categories"]
    ).toEqual(filter(["a"]));
  });
});
