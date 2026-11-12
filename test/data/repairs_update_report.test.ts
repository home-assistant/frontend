import { describe, expect, it } from "vitest";
import type { UpdateReport } from "../../src/data/repairs";
import { updateReportAffected } from "../../src/data/repairs";

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
      automations: ["automation.a"],
      scripts: ["script.b"],
    },
  ],
  entities_removed: [
    {
      entity_id: "sensor.gone",
      platform: "demo",
      automations: [],
      scripts: ["script.b"],
    },
  ],
  issues: [],
  upcoming: [],
};

describe("updateReportAffected", () => {
  it("lists automations and scripts per old entity_id, sorted", () => {
    expect(updateReportAffected(report)).toEqual([
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

  it("returns nothing when no automation or script references them", () => {
    expect(
      updateReportAffected({
        ...report,
        entities_renamed: [
          { ...report.entities_renamed[0], automations: [], scripts: [] },
        ],
        entities_removed: [
          { ...report.entities_removed[0], automations: [], scripts: [] },
        ],
      })
    ).toEqual([]);
  });
});
