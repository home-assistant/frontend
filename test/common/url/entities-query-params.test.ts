import { describe, expect, it } from "vitest";

import {
  entitiesFilterQueryParamConfig,
  entitiesFilterQueryParams,
  entitiesLinkFromUrl,
} from "../../../src/common/url/entities-query-params";
import {
  createQueryString,
  updateQueryString,
} from "../../../src/common/url/query-params";

describe("entities query params", () => {
  it("reads nothing without table params", () => {
    expect(entitiesLinkFromUrl("?historyBack=1")).toBeUndefined();
  });

  it("replaces every filter and the search with what a link asks for", () => {
    expect(entitiesLinkFromUrl("?device=abc&label=a,b")).toEqual({
      search: "",
      filters: {
        "ha-filter-states": [],
        "ha-filter-floor-areas": undefined,
        "ha-filter-devices": ["abc"],
        "ha-filter-integrations": [],
        "ha-filter-domains": [],
        "ha-filter-labels": ["a", "b"],
        "ha-filter-voice-assistants": [],
        config_entry: [],
        sub_entry: [],
      },
    });
  });

  it("still reads voice_assistant, with assistants winning", () => {
    expect(
      entitiesLinkFromUrl("?voice_assistant=conversation")?.filters[
        "ha-filter-voice-assistants"
      ]
    ).toEqual(["conversation"]);
    expect(
      entitiesLinkFromUrl(
        "?voice_assistant=conversation&assistants=cloud.alexa"
      )?.filters["ha-filter-voice-assistants"]
    ).toEqual(["cloud.alexa"]);
  });

  it("replaces voice_assistant with assistants on write", () => {
    const url = "?historyBack=1&voice_assistant=conversation";
    const link = entitiesLinkFromUrl(url);

    expect(
      updateQueryString(
        url,
        entitiesFilterQueryParams(link?.filters ?? {}),
        entitiesFilterQueryParamConfig
      )
    ).toBe("historyBack=1&assistants=conversation");
  });

  it("round trips the filters", () => {
    const filters = {
      "ha-filter-states": ["enabled", "hidden"],
      "ha-filter-floor-areas": { floors: ["ground"], areas: ["kitchen"] },
      "ha-filter-devices": ["abc"],
      "ha-filter-integrations": ["hue"],
      "ha-filter-domains": ["light"],
      "ha-filter-labels": ["a"],
      "ha-filter-voice-assistants": ["conversation"],
      config_entry: ["entry"],
      sub_entry: ["sub"],
    };

    expect(
      entitiesLinkFromUrl(
        createQueryString(
          entitiesFilterQueryParams(filters),
          entitiesFilterQueryParamConfig
        )
      )
    ).toEqual({ search: "", filters });
  });
});
