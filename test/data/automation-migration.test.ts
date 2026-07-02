import { describe, expect, it } from "vitest";
import type { AutomationMigrationReport } from "../../src/data/automation";
import {
  migrateAutomationConfig,
  normalizeAutomationConfig,
} from "../../src/data/automation";

describe("normalizeAutomationConfig deprecated option reporting", () => {
  it("reports nothing for an already up-to-date config", () => {
    const report: AutomationMigrationReport = { deprecated: false };
    normalizeAutomationConfig(
      {
        triggers: [{ trigger: "state", entity_id: "light.kitchen" } as any],
        actions: [],
      },
      report
    );
    expect(report.deprecated).toBe(false);
  });

  it("does not flag legacy alias migrations as deprecated", () => {
    const report: AutomationMigrationReport = { deprecated: false };
    const config = normalizeAutomationConfig(
      {
        trigger: [{ platform: "state", entity_id: "light.kitchen" }],
        action: [{ service: "light.turn_on" }],
      } as any,
      report
    );
    // Aliases are normalized...
    expect(config.triggers).toEqual([
      { trigger: "state", entity_id: "light.kitchen" },
    ]);
    expect(config.actions).toEqual([{ action: "light.turn_on" }]);
    // ...but they are not deprecated options that raise a repair.
    expect(report.deprecated).toBe(false);
  });

  it("migrates and flags the deprecated `any` behavior", () => {
    const report: AutomationMigrationReport = { deprecated: false };
    const config = migrateAutomationConfig(
      {
        triggers: [
          {
            trigger: "state",
            entity_id: "light.kitchen",
            options: { behavior: "any" },
          } as any,
        ],
      },
      report
    );
    expect((config.triggers as any)[0].options.behavior).toBe("each");
    expect(report.deprecated).toBe(true);
  });

  it("migrates and flags the deprecated `last` behavior", () => {
    const report: AutomationMigrationReport = { deprecated: false };
    const config = migrateAutomationConfig(
      {
        triggers: [
          {
            trigger: "state",
            entity_id: "light.kitchen",
            options: { behavior: "last" },
          } as any,
        ],
      },
      report
    );
    expect((config.triggers as any)[0].options.behavior).toBe("all");
    expect(report.deprecated).toBe(true);
  });

  it("flags deprecated behavior nested in wait_for_trigger actions", () => {
    const report: AutomationMigrationReport = { deprecated: false };
    migrateAutomationConfig(
      {
        triggers: [],
        actions: [
          {
            wait_for_trigger: [
              {
                trigger: "state",
                entity_id: "light.kitchen",
                options: { behavior: "any" },
              },
            ],
          } as any,
        ],
      },
      report
    );
    expect(report.deprecated).toBe(true);
  });

  it("works without a report argument", () => {
    expect(() =>
      migrateAutomationConfig({
        triggers: [
          {
            trigger: "state",
            entity_id: "light.kitchen",
            options: { behavior: "any" },
          } as any,
        ],
      })
    ).not.toThrow();
  });
});
