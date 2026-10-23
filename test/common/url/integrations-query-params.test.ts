import { describe, expect, it } from "vitest";

import {
  integrationSearchFromUrl,
  integrationsLinkFromUrl,
  integrationsQueryParamConfig,
  integrationsQueryParams,
} from "../../../src/common/url/integrations-query-params";
import { createQueryString } from "../../../src/common/url/query-params";

describe("integrations query params", () => {
  it("reads nothing without integrations params", () => {
    expect(integrationsLinkFromUrl("?historyBack=1")).toBeUndefined();
  });

  it("reads the search and toggles of a link", () => {
    expect(integrationsLinkFromUrl("?search=hue&status=ignored")).toEqual({
      search: "hue",
      showIgnored: true,
      showDisabled: false,
    });
    expect(integrationsLinkFromUrl("?status=disabled")).toEqual({
      search: "",
      showIgnored: false,
      showDisabled: true,
    });
  });

  it("leaves empty values out", () => {
    expect(
      createQueryString(
        integrationsQueryParams({
          search: "",
          showIgnored: false,
          showDisabled: false,
        }),
        integrationsQueryParamConfig
      )
    ).toBe("");
  });

  it("round trips the state", () => {
    const state = { search: "hue", showIgnored: true, showDisabled: true };
    expect(
      integrationsLinkFromUrl(
        createQueryString(
          integrationsQueryParams(state),
          integrationsQueryParamConfig
        )
      )
    ).toEqual(state);
  });
});

describe("integrationSearchFromUrl", () => {
  it("reads the search, undefined without it", () => {
    expect(integrationSearchFromUrl("?search=bridge")).toBe("bridge");
    expect(integrationSearchFromUrl("?search=")).toBe("");
    expect(integrationSearchFromUrl("?other=1")).toBeUndefined();
  });
});
