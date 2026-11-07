import { describe, expect, it } from "vitest";

import {
  logSearchFromUrl,
  logsLinkFromUrl,
  logsQueryParamConfig,
  logsQueryParams,
} from "../../../src/common/url/logs-query-params";
import {
  createQueryString,
  updateQueryString,
} from "../../../src/common/url/query-params";

describe("logSearchFromUrl", () => {
  it("reads search, then the old filter name", () => {
    expect(logSearchFromUrl("?search=zwave_js")).toBe("zwave_js");
    expect(logSearchFromUrl("?filter=zwave_js")).toBe("zwave_js");
    expect(logSearchFromUrl("?search=new&filter=old")).toBe("new");
    expect(logSearchFromUrl("")).toBe("");
  });
});

describe("logs query params", () => {
  it("reads nothing without logs params", () => {
    expect(logsLinkFromUrl("?other=1")).toBeUndefined();
  });

  it("reads the integrations, search and provider of a link", () => {
    expect(logsLinkFromUrl("?integration=hue,mqtt&search=timeout")).toEqual({
      provider: "core",
      search: "timeout",
      integrations: ["hue", "mqtt"],
      raw: false,
    });
    expect(logsLinkFromUrl("?provider=supervisor")).toEqual({
      provider: "supervisor",
      search: "",
      integrations: [],
      raw: false,
    });
    expect(logsLinkFromUrl("?integration=hue&raw=1")?.raw).toBe(true);
  });

  it("reads the old filter name as the search", () => {
    expect(logsLinkFromUrl("?filter=zwave_js")?.search).toBe("zwave_js");
    expect(logsLinkFromUrl("?search=new&filter=old")?.search).toBe("new");
  });

  it("ignores integrations and the raw view for other providers", () => {
    const link = logsLinkFromUrl("?provider=supervisor&integration=hue&raw=1");
    expect(link?.integrations).toEqual([]);
    expect(link?.raw).toBe(false);
  });

  it("leaves the default provider and empty values out", () => {
    expect(
      createQueryString(
        logsQueryParams({
          provider: "core",
          search: "",
          integrations: [],
          raw: false,
        }),
        logsQueryParamConfig
      )
    ).toBe("");
  });

  it("replaces the old filter name with search", () => {
    expect(
      updateQueryString(
        "?filter=old&other=1",
        logsQueryParams({
          provider: "core",
          search: "old",
          integrations: [],
          raw: false,
        }),
        logsQueryParamConfig
      )
    ).toBe("other=1&search=old");
  });

  it("round trips the state", () => {
    const state = {
      provider: "core",
      search: "timeout",
      integrations: ["hue", "mqtt"],
      raw: true,
    };
    expect(
      logsLinkFromUrl(
        createQueryString(logsQueryParams(state), logsQueryParamConfig)
      )
    ).toEqual(state);
  });
});
