import { describe, expect, it } from "vitest";

import {
  devicesFilterQueryParamConfig,
  devicesFilterQueryParams,
  devicesFilterQueryString,
  devicesLinkFromUrl,
} from "../../../src/common/url/devices-query-params";
import { createQueryString } from "../../../src/common/url/query-params";

describe("devices query params", () => {
  it("reads nothing without table params", () => {
    expect(devicesLinkFromUrl("?historyBack=1")).toBeUndefined();
  });

  it("replaces every filter and the search with what a link asks for", () => {
    expect(devicesLinkFromUrl("?config_entry=abc&label=a,b")).toEqual({
      search: "",
      filters: {
        "ha-filter-states": { value: [], items: undefined },
        "ha-filter-floor-areas": { value: undefined, items: undefined },
        "ha-filter-integrations": { value: [], items: undefined },
        "ha-filter-labels": { value: ["a", "b"], items: undefined },
        config_entry: { value: ["abc"], items: undefined },
        sub_entry: { value: [], items: undefined },
      },
    });
  });

  it("round trips the filters", () => {
    const filters = {
      "ha-filter-states": { value: ["disabled"], items: undefined },
      "ha-filter-floor-areas": {
        value: { floors: ["ground"], areas: ["kitchen"] },
        items: undefined,
      },
      "ha-filter-integrations": { value: ["hue"], items: undefined },
      "ha-filter-labels": { value: ["a"], items: undefined },
      config_entry: { value: ["abc"], items: undefined },
      sub_entry: { value: ["def"], items: undefined },
    };

    expect(
      devicesLinkFromUrl(
        createQueryString(
          devicesFilterQueryParams(filters),
          devicesFilterQueryParamConfig
        )
      )
    ).toEqual({ search: "", filters });
  });

  // Without it in the URL, reading the URL back drops the "No area" choice
  it("round trips the no area choice on its own", () => {
    const query = createQueryString(
      devicesFilterQueryParams({
        "ha-filter-floor-areas": {
          value: { no_area: true },
          items: undefined,
        },
      }),
      devicesFilterQueryParamConfig
    );

    expect(query).toBe("no_area=1");
    // The page stores a filter as the user's choice when this string changes
    expect(
      devicesFilterQueryString({
        "ha-filter-floor-areas": { value: { no_area: true }, items: undefined },
      })
    ).toBe("no_area=1");
    expect(
      devicesLinkFromUrl(query)?.filters["ha-filter-floor-areas"].value
    ).toEqual({ floors: [], areas: [], no_area: true });
  });

  it("writes the values, not the items the filters found", () => {
    expect(
      devicesFilterQueryParams({
        "ha-filter-floor-areas": {
          value: { areas: ["kitchen"] },
          items: new Set(["device_1"]),
        },
      })
    ).toEqual({
      status: undefined,
      floor: undefined,
      area: ["kitchen"],
      domain: undefined,
      label: undefined,
      config_entry: undefined,
      sub_entry: undefined,
    });
  });
});
