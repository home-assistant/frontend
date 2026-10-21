import { describe, expect, it } from "vitest";

import {
  helpersFilterQueryParamConfig,
  helpersFilterQueryParams,
  helpersLinkFromUrl,
} from "../../../src/common/url/helpers-query-params";
import {
  createQueryString,
  updateQueryString,
} from "../../../src/common/url/query-params";

describe("helpers query params", () => {
  it("reads nothing without table params", () => {
    expect(helpersLinkFromUrl("?domain=input_boolean")).toBeUndefined();
  });

  it("replaces every filter and the search with what a link asks for", () => {
    expect(helpersLinkFromUrl("?category=abc&label=a,b")).toEqual({
      search: "",
      filters: {
        "ha-filter-floor-areas": undefined,
        "ha-filter-devices": [],
        "ha-filter-labels": ["a", "b"],
        "ha-filter-categories": ["abc"],
        "ha-filter-voice-assistants": [],
      },
    });
  });

  it("still reads voice_assistant, with assistants winning", () => {
    expect(
      helpersLinkFromUrl("?voice_assistant=conversation")?.filters[
        "ha-filter-voice-assistants"
      ]
    ).toEqual(["conversation"]);
    expect(
      helpersLinkFromUrl("?voice_assistant=conversation&assistants=cloud.alexa")
        ?.filters["ha-filter-voice-assistants"]
    ).toEqual(["cloud.alexa"]);
  });

  it("replaces voice_assistant with assistants on write", () => {
    const url = "?historyBack=1&voice_assistant=conversation";
    const link = helpersLinkFromUrl(url);

    expect(
      updateQueryString(
        url,
        helpersFilterQueryParams(link?.filters ?? {}),
        helpersFilterQueryParamConfig
      )
    ).toBe("historyBack=1&assistants=conversation");
  });

  it("round trips the filters", () => {
    const filters = {
      "ha-filter-floor-areas": { floors: ["ground"], areas: ["kitchen"] },
      "ha-filter-devices": ["abc"],
      "ha-filter-labels": ["a"],
      "ha-filter-categories": ["cat"],
      "ha-filter-voice-assistants": ["conversation"],
    };

    expect(
      helpersLinkFromUrl(
        createQueryString(
          helpersFilterQueryParams(filters),
          helpersFilterQueryParamConfig
        )
      )
    ).toEqual({ search: "", filters });
  });
});
