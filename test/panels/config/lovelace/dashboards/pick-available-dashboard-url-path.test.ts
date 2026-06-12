import { assert, describe, it } from "vitest";
import { pickAvailableDashboardUrlPath } from "../../../../../src/panels/config/lovelace/dashboards/pick-available-dashboard-url-path";

describe("pickAvailableDashboardUrlPath", () => {
  it("returns base when free", () => {
    assert.strictEqual(
      pickAvailableDashboardUrlPath("dashboard-map", new Set(["config"])),
      "dashboard-map"
    );
  });

  it("appends -2 when base is taken", () => {
    assert.strictEqual(
      pickAvailableDashboardUrlPath(
        "dashboard-map",
        new Set(["dashboard-map"])
      ),
      "dashboard-map-2"
    );
  });

  it("increments until a free path is found", () => {
    assert.strictEqual(
      pickAvailableDashboardUrlPath(
        "dashboard-map",
        new Set(["dashboard-map", "dashboard-map-2", "dashboard-map-3"])
      ),
      "dashboard-map-4"
    );
  });
});
