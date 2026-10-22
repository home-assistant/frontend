import { describe, expect, it } from "vitest";

import {
  logsLinkFromUrl,
  logsQueryParamConfig,
  logsQueryParams,
} from "../../../src/common/url/logs-query-params";
import { createQueryString } from "../../../src/common/url/query-params";

describe("logs query params", () => {
  it("reads nothing without logs params", () => {
    expect(logsLinkFromUrl("?other=1")).toBeUndefined();
  });

  it("reads the integrations, search and provider of a link", () => {
    expect(logsLinkFromUrl("?integration=hue,mqtt&filter=timeout")).toEqual({
      provider: "core",
      filter: "timeout",
      integrations: ["hue", "mqtt"],
      raw: false,
    });
    expect(logsLinkFromUrl("?provider=supervisor")).toEqual({
      provider: "supervisor",
      filter: "",
      integrations: [],
      raw: false,
    });
    expect(logsLinkFromUrl("?integration=hue&raw=1")?.raw).toBe(true);
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
          filter: "",
          integrations: [],
          raw: false,
        }),
        logsQueryParamConfig
      )
    ).toBe("");
  });

  it("round trips the state", () => {
    const state = {
      provider: "core",
      filter: "timeout",
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
