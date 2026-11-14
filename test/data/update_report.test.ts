import { describe, expect, it, vi } from "vitest";
import type { UpdateReport } from "../../src/data/update_report";
import {
  fetchUpdateReport,
  findCoreUpdateEntityId,
  updateReportWorseCount,
  updateReportReferencePath,
  updateReportReferences,
} from "../../src/data/update_report";

const emptyReport: UpdateReport = {
  from_version: "2026.10.0",
  to_version: "2026.11.0",
  created: "2026-11-13T10:00:00+00:00",
  pending: false,
  config_entries: [],
  entities_unavailable: [],
  entities_renamed: [],
  entities_removed: [],
  issues: [],
  upcoming: [],
};

describe("fetchUpdateReport", () => {
  it("asks for the report of the update entity", async () => {
    const callWS = vi.fn().mockResolvedValue(null);
    expect(
      await fetchUpdateReport(
        { callWS } as any,
        "update.home_assistant_core_update"
      )
    ).toBeNull();
    expect(callWS).toHaveBeenCalledWith({
      type: "update/report",
      entity_id: "update.home_assistant_core_update",
    });
  });
});

describe("updateReportWorseCount", () => {
  it("is 0 for an empty report", () => {
    expect(updateReportWorseCount(emptyReport)).toBe(0);
  });

  it("ignores upcoming breaking changes", () => {
    expect(
      updateReportWorseCount({
        ...emptyReport,
        upcoming: [
          {
            domain: "homeassistant",
            issue_id: "deprecated_yaml",
            issue_domain: "demo",
            breaks_in_ha_version: "2027.5.0",
            dismissed: false,
          },
        ],
      })
    ).toBe(0);
  });

  it.each([
    [
      "config_entries",
      {
        config_entries: [
          {
            entry_id: "abc",
            domain: "demo",
            title: "Demo",
            state: "setup_retry" as const,
            translation_domain: null,
            translation_key: null,
            translation_placeholders: null,
          },
        ],
      },
    ],
    [
      "entities_unavailable",
      {
        entities_unavailable: [
          {
            entity_id: "sensor.a",
            platform: "demo",
            state: "unavailable" as const,
          },
        ],
      },
    ],
    [
      "entities_removed",
      {
        entities_removed: [
          {
            entity_id: "sensor.a",
            platform: "demo",
            automations: [],
            scripts: [],
          },
        ],
      },
    ],
    ["issues", { issues: [{ domain: "demo", issue_id: "broken" }] }],
  ])("counts %s", (_name, changes) => {
    expect(updateReportWorseCount({ ...emptyReport, ...changes })).toBe(1);
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

describe("updateReportReferences", () => {
  it("lists automations before scripts", () => {
    expect(
      updateReportReferences({
        entity_id: "sensor.a",
        platform: "demo",
        automations: [
          { entity_id: "automation.lights", id: "1", name: "Lights" },
        ],
        scripts: [{ entity_id: "script.night", id: "night", name: null }],
      })
    ).toEqual([
      { entity_id: "automation.lights", id: "1", name: "Lights" },
      { entity_id: "script.night", id: "night", name: null },
    ]);
  });
});

describe("updateReportReferencePath", () => {
  it.each([
    ["automation.lights", "1700000000", "/config/automation/edit/1700000000"],
    ["script.night", "night", "/config/script/edit/night"],
    ["automation.yaml", null, "/config/automation/show/automation.yaml"],
    ["script.yaml", null, "/config/script/show/script.yaml"],
  ])("links %s to its editor", (entityId, id, path) => {
    expect(
      updateReportReferencePath({ entity_id: entityId, id, name: null })
    ).toBe(path);
  });
});
