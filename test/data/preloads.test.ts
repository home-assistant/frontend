import { describe, expect, it } from "vitest";
import { getPreloadDashboardUrlPath } from "../../src/data/preloads";

describe("getPreloadDashboardUrlPath", () => {
  it("returns the lovelace dashboard", () => {
    expect(getPreloadDashboardUrlPath("/lovelace")).toBe("lovelace");
    expect(getPreloadDashboardUrlPath("/lovelace/0")).toBe("lovelace");
  });

  it("returns a dashboard with a hyphen in its url path", () => {
    expect(getPreloadDashboardUrlPath("/dashboard-test")).toBe(
      "dashboard-test"
    );
    expect(getPreloadDashboardUrlPath("/dashboard-test/kitchen")).toBe(
      "dashboard-test"
    );
  });

  it("returns nothing when the default panel is opened", () => {
    expect(getPreloadDashboardUrlPath("/")).toBeUndefined();
  });

  it("returns nothing for panels that cannot be a dashboard", () => {
    expect(getPreloadDashboardUrlPath("/home")).toBeUndefined();
    expect(getPreloadDashboardUrlPath("/config/dashboard")).toBeUndefined();
    expect(getPreloadDashboardUrlPath("/lovelaces")).toBeUndefined();
  });
});
