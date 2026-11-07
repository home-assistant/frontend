import { describe, expect, it } from "vitest";
import type { UpdateReport } from "../../src/data/repairs";
import {
  updateReportAffected,
  updateReportOldEntityIds,
} from "../../src/data/repairs";

const report: UpdateReport = {
  from_version: "2026.10.0",
  to_version: "2026.11.0",
  created: "2026-10-31T12:00:00+00:00",
  config_entries: [],
  entities_unavailable: [],
  entities_renamed: [
    {
      old_entity_id: "sensor.old_name",
      entity_id: "sensor.new_name",
      platform: "demo",
    },
  ],
  entities_removed: [{ entity_id: "sensor.gone", platform: "demo" }],
  issues: [],
  upcoming: [],
};

describe("updateReportOldEntityIds", () => {
  it("maps old entity_ids to the new one, null when removed", () => {
    expect([...updateReportOldEntityIds(report)]).toEqual([
      ["sensor.gone", null],
      ["sensor.old_name", "sensor.new_name"],
    ]);
  });
});

describe("updateReportAffected", () => {
  it("lists automations and scripts per old entity_id, sorted", () => {
    expect(
      updateReportAffected(updateReportOldEntityIds(report), {
        "sensor.gone": { script: ["script.b"], device: ["abc"] },
        "sensor.old_name": {
          automation: ["automation.a"],
          script: ["script.b"],
        },
      })
    ).toEqual([
      {
        entity_id: "automation.a",
        old_entity_id: "sensor.old_name",
        new_entity_id: "sensor.new_name",
      },
      {
        entity_id: "script.b",
        old_entity_id: "sensor.gone",
        new_entity_id: null,
      },
      {
        entity_id: "script.b",
        old_entity_id: "sensor.old_name",
        new_entity_id: "sensor.new_name",
      },
    ]);
  });

  it("returns nothing without related results", () => {
    expect(updateReportAffected(updateReportOldEntityIds(report), {})).toEqual(
      []
    );
  });
});
