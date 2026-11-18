import { describe, expect, it, vi } from "vitest";
import {
  fetchUpdateReport,
  fetchUpdateReports,
  findCoreUpdateEntityId,
  updateReportPath,
  updateReportReleaseUrl,
  updateReportStartupSeconds,
} from "../../src/data/update_report";

describe("fetchUpdateReports", () => {
  it("asks for the reports of the update entity", async () => {
    const callWS = vi.fn().mockResolvedValue([]);
    expect(
      await fetchUpdateReports(
        { callWS } as any,
        "update.home_assistant_core_update"
      )
    ).toEqual([]);
    expect(callWS).toHaveBeenCalledWith({
      type: "update/reports",
      entity_id: "update.home_assistant_core_update",
    });
  });
});

describe("fetchUpdateReport", () => {
  it("asks for one report of the update entity", async () => {
    const callWS = vi.fn().mockResolvedValue(null);
    expect(
      await fetchUpdateReport(
        { callWS } as any,
        "update.home_assistant_core_update",
        "01JCORE"
      )
    ).toBeNull();
    expect(callWS).toHaveBeenCalledWith({
      type: "update/report",
      entity_id: "update.home_assistant_core_update",
      report_id: "01JCORE",
    });
  });
});

describe("updateReportPath", () => {
  it("links to the report subpage of the update", () => {
    expect(updateReportPath("update.home_assistant_core_update", "a/b")).toBe(
      "/config/updates/details/update.home_assistant_core_update/report/a%2Fb"
    );
  });
});

describe("updateReportReleaseUrl", () => {
  it("links to the GitHub release of the version", () => {
    expect(updateReportReleaseUrl("2026.11.0")).toBe(
      "https://github.com/home-assistant/core/releases/tag/2026.11.0"
    );
  });
});

describe("updateReportStartupSeconds", () => {
  it("rounds the time between the update and the start", () => {
    expect(
      updateReportStartupSeconds({
        update_started: "2026-11-04T19:02:00+00:00",
        started: "2026-11-04T19:02:42.600+00:00",
      })
    ).toBe(43);
  });

  it("is undefined until Home Assistant started", () => {
    expect(
      updateReportStartupSeconds({
        update_started: "2026-11-04T19:02:00+00:00",
        started: null,
      })
    ).toBeUndefined();
  });
});

describe("findCoreUpdateEntityId", () => {
  it("finds the Home Assistant Core update entity", () => {
    expect(
      findCoreUpdateEntityId({
        "update.demo": {
          entity_id: "update.demo",
          attributes: { title: "Demo" },
        },
        "sensor.core": {
          entity_id: "sensor.core",
          attributes: { title: "Home Assistant Core" },
        },
        "update.home_assistant_core_update": {
          entity_id: "update.home_assistant_core_update",
          attributes: { title: "Home Assistant Core" },
        },
      } as any)
    ).toBe("update.home_assistant_core_update");
  });

  it("is undefined without a core update entity", () => {
    expect(findCoreUpdateEntityId({})).toBeUndefined();
  });
});
