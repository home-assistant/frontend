import type { HassEntities } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { ConfigEntry } from "../../src/data/config_entries";
import { computeConfigEntryHealth } from "../../src/data/config_entry_health";
import type { DataEntryFlowProgress } from "../../src/data/data_entry_flow";
import type { EntityRegistryEntry } from "../../src/data/entity/entity_registry";
import type { RepairsIssue } from "../../src/data/repairs";
import type { LoggedError } from "../../src/data/system_log";

const ENTRY = {
  entry_id: "entry_1",
  domain: "hue",
  title: "Hue bridge",
  state: "loaded",
  disabled_by: null,
} as ConfigEntry;

const entity = (
  entityId: string,
  disabledBy: EntityRegistryEntry["disabled_by"] = null
) =>
  ({
    entity_id: entityId,
    config_entry_id: "entry_1",
    disabled_by: disabledBy,
  }) as EntityRegistryEntry;

const ENTITIES = [
  entity("light.kitchen"),
  entity("light.hall"),
  entity("sensor.disabled", "user"),
];

const STATES = {
  "light.kitchen": { state: "on" },
  "light.hall": { state: "on" },
} as unknown as HassEntities;

const issue = (
  domain: string,
  severity: RepairsIssue["severity"],
  ignored = false
) =>
  ({
    domain,
    issue_domain: null,
    issue_id: `${domain}_${severity}`,
    severity,
    ignored,
  }) as RepairsIssue;

const logged = (name: string, level: LoggedError["level"], count: number) =>
  ({
    name,
    level,
    count,
    source: ["homeassistant/components/x.py", 1],
  }) as LoggedError;

const flow = (entryId: string, source: string) =>
  ({
    flow_id: `${entryId}_${source}`,
    handler: "hue",
    step_id: "user",
    context: { entry_id: entryId, source },
  }) as DataEntryFlowProgress;

const health = (overrides: {
  entry?: Partial<ConfigEntry>;
  states?: HassEntities;
  issues?: RepairsIssue[];
  log?: LoggedError[];
  flows?: DataEntryFlowProgress[];
}) =>
  computeConfigEntryHealth(
    { ...ENTRY, ...overrides.entry } as ConfigEntry,
    ENTITIES,
    overrides.states ?? STATES,
    overrides.issues ?? [],
    overrides.log ?? [],
    overrides.flows ?? [],
    [{ domain: "hue", seconds: 1.5 }]
  );

describe("computeConfigEntryHealth", () => {
  it("is ok when loaded and nothing needs attention", () => {
    const result = health({});
    expect(result.status).toBe("ok");
    expect(result.entities).toEqual({
      status: "ok",
      total: 2,
      unavailable: [],
    });
    expect(result.setupSeconds).toBe(1.5);
  });

  it.each([
    ["setup_retry", "warning"],
    ["setup_error", "error"],
    ["not_loaded", "ok"],
  ] as const)("maps entry state %s to %s", (state, status) => {
    expect(health({ entry: { state } }).status).toBe(status);
  });

  it("counts enabled entities without a usable state as unavailable", () => {
    const result = health({
      states: {
        "light.kitchen": { state: "unavailable" },
      } as unknown as HassEntities,
    });
    expect(result.status).toBe("warning");
    expect(result.entities.unavailable.map((item) => item.entity_id)).toEqual([
      "light.kitchen",
      "light.hall",
    ]);
  });

  it("uses open repairs of the integration", () => {
    const result = health({
      issues: [
        issue("hue", "warning"),
        issue("hue", "critical", true),
        issue("zha", "error"),
      ],
    });
    expect(result.repairs.issues).toHaveLength(1);
    expect(result.status).toBe("warning");
    expect(health({ issues: [issue("hue", "error")] }).status).toBe("error");
  });

  it("sums logged errors and warnings of the integration", () => {
    const result = health({
      log: [
        logged("homeassistant.components.hue.light", "error", 3),
        logged("homeassistant.components.hue", "warning", 2),
        logged("homeassistant.components.zha", "error", 9),
      ],
    });
    expect(result.logs).toEqual({ status: "error", errors: 3, warnings: 2 });
  });

  it("flags reauthentication of this entry only", () => {
    const result = health({
      flows: [
        flow("entry_1", "reauth"),
        flow("entry_2", "reauth"),
        flow("entry_1", "user"),
      ],
    });
    expect(result.flows.flows).toHaveLength(1);
    expect(result.status).toBe("error");
  });
});
