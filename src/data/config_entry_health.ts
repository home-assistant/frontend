import type { HassEntities } from "home-assistant-js-websocket";
import type { ConfigEntry } from "./config_entries";
import type { DataEntryFlowProgress } from "./data_entry_flow";
import type { EntityRegistryEntry } from "./entity/entity_registry";
import type { IntegrationSetup } from "./integration";
import type { RepairsIssue } from "./repairs";
import type { LoggedError } from "./system_log";
import { getLoggedErrorIntegration } from "./system_log";

export type HealthStatus = "ok" | "warning" | "error" | "info";

export type OverallHealthStatus = Exclude<HealthStatus, "info">;

export interface ConfigEntryHealth {
  status: OverallHealthStatus;
  state: HealthStatus;
  entities: {
    status: HealthStatus;
    total: number;
    unavailable: EntityRegistryEntry[];
  };
  repairs: { status: HealthStatus; issues: RepairsIssue[] };
  logs: { status: HealthStatus; errors: number; warnings: number };
  flows: { status: HealthStatus; flows: DataEntryFlowProgress[] };
  setupSeconds?: number;
}

const ATTENTION_SOURCES = ["reauth", "reconfigure"];

const STATE_STATUS: Record<ConfigEntry["state"], HealthStatus> = {
  loaded: "ok",
  setup_in_progress: "info",
  unload_in_progress: "info",
  not_loaded: "info",
  setup_retry: "warning",
  setup_error: "error",
  migration_error: "error",
  failed_unload: "error",
};

const worst = (statuses: HealthStatus[]): OverallHealthStatus =>
  statuses.includes("error")
    ? "error"
    : statuses.includes("warning")
      ? "warning"
      : "ok";

export const computeConfigEntryHealth = (
  entry: ConfigEntry,
  entities: EntityRegistryEntry[],
  states: HassEntities,
  issues: RepairsIssue[],
  log: LoggedError[],
  flows: DataEntryFlowProgress[],
  setups: IntegrationSetup[]
): ConfigEntryHealth => {
  const enabled = entities.filter((entity) => !entity.disabled_by);
  // Entities without a state yet (e.g. while the entry is not loaded) count as unavailable.
  const unavailable = enabled.filter(
    (entity) =>
      !states[entity.entity_id] ||
      states[entity.entity_id].state === "unavailable"
  );
  const entryIssues = issues.filter(
    (issue) =>
      !issue.ignored && (issue.issue_domain ?? issue.domain) === entry.domain
  );
  const entryLog = log.filter(
    (item) => getLoggedErrorIntegration(item) === entry.domain
  );
  const sumCount = (levels: LoggedError["level"][]) =>
    entryLog
      .filter((item) => levels.includes(item.level))
      .reduce((total, item) => total + item.count, 0);
  const errors = sumCount(["error", "critical"]);
  const warnings = sumCount(["warning"]);
  const entryFlows = flows.filter(
    (flow) =>
      flow.handler === entry.domain &&
      flow.context.entry_id === entry.entry_id &&
      ATTENTION_SOURCES.includes(flow.context.source)
  );

  // A disabled entry that failed to unload still needs a restart.
  const state: HealthStatus =
    entry.disabled_by && entry.state !== "failed_unload"
      ? "info"
      : STATE_STATUS[entry.state];
  const health: ConfigEntryHealth = {
    status: "ok",
    state,
    entities: {
      status: entry.disabled_by || !unavailable.length ? "ok" : "warning",
      total: enabled.length,
      unavailable,
    },
    repairs: {
      status: entryIssues.some((issue) => issue.severity !== "warning")
        ? "error"
        : entryIssues.length
          ? "warning"
          : "ok",
      issues: entryIssues,
    },
    logs: {
      status: errors ? "error" : warnings ? "warning" : "ok",
      errors,
      warnings,
    },
    flows: { status: entryFlows.length ? "error" : "ok", flows: entryFlows },
    setupSeconds: setups.find((setup) => setup.domain === entry.domain)
      ?.seconds,
  };
  health.status = worst([
    state,
    health.entities.status,
    health.repairs.status,
    health.logs.status,
    health.flows.status,
  ]);
  return health;
};
