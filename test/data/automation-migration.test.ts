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

describe("migrateAutomationConfig offset type", () => {
  const migrateTrigger = (trigger: Record<string, unknown>) =>
    (
      migrateAutomationConfig({ triggers: [trigger as any] }).triggers as any
    )[0];

  it.each([
    ["sun.sunrise", { hours: 1 }, { hours: -1 }],
    [
      "calendar.event_started",
      { hours: 1, minutes: 30 },
      { hours: -1, minutes: -30 },
    ],
    ["sun.sunset", { hours: -1 }, { hours: 1 }],
    [
      "sun.dawn",
      "00:30:00",
      { hours: 0, minutes: -30, seconds: 0, milliseconds: 0 },
    ],
  ])(
    "folds a `before` offset type into the sign for %s",
    (trigger, offset, expected) => {
      expect(
        migrateTrigger({ trigger, options: { offset, offset_type: "before" } })
      ).toEqual({ trigger, options: { offset: expected } });
    }
  );

  it("drops an `after` offset type and keeps the offset", () => {
    expect(
      migrateTrigger({
        trigger: "calendar.event_ended",
        options: { offset: { hours: 1 }, offset_type: "after" },
      })
    ).toEqual({
      trigger: "calendar.event_ended",
      options: { offset: { hours: 1 } },
    });
  });

  it("drops the offset type when there is no offset", () => {
    expect(
      migrateTrigger({
        trigger: "sun.sunrise",
        options: { offset_type: "before" },
      })
    ).toEqual({ trigger: "sun.sunrise", options: {} });
  });

  it("leaves an offset it cannot read untouched", () => {
    const options = { offset: "{{ offset }}", offset_type: "before" };
    expect(
      migrateTrigger({ trigger: "sun.sunrise", options: { ...options } })
    ).toEqual({ trigger: "sun.sunrise", options });
  });

  it("leaves other integrations untouched", () => {
    const options = { offset: { hours: 1 }, offset_type: "before" };
    expect(
      migrateTrigger({ trigger: "custom.event", options: { ...options } })
    ).toEqual({ trigger: "custom.event", options });
  });

  it("does not flag the migration as deprecated", () => {
    const report: AutomationMigrationReport = { deprecated: false };
    migrateAutomationConfig(
      {
        triggers: [
          {
            trigger: "sun.sunrise",
            options: { offset: { hours: 1 }, offset_type: "before" },
          } as any,
        ],
      },
      report
    );
    expect(report.deprecated).toBe(false);
  });
});
