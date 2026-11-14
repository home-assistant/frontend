import { ensureArray } from "../common/array/ensure-array";
import type { HomeAssistantApi } from "../types";
import type { AutomationConfig, Condition, Trigger } from "./automation";

export type DryRunConditionResult =
  "pass" | "fail" | "error" | "depends_on_trigger" | "disabled";

export type DryRunTriggerStatus =
  | "in_target_state"
  | "not_in_target_state"
  | "in_range"
  | "not_in_range"
  | "scheduled"
  | "waits_for_event"
  | "disabled"
  | "error";

export type DryRunReason =
  | "automation_off"
  | "conditions_not_met"
  | "condition_error"
  | "depends_on_trigger"
  | "already_running"
  | "max_runs_reached";

export interface DryRunSubResult {
  result: boolean;
  state?: unknown;
  wanted_state?: unknown;
  wanted_state_above?: number;
  wanted_state_below?: number;
  duration?: string;
  message?: string;
}

export interface DryRunDetails {
  sub_results?: Record<string, DryRunSubResult>;
  entities?: string[];
  after?: string;
  before?: string;
  now_time?: string;
  weekday?: string | string[];
  now_weekday?: string;
}

export interface DryRunTrigger {
  idx: string;
  id: string;
  trigger: string;
  alias?: string;
  status: DryRunTriggerStatus;
  next?: string;
  error?: string;
  details?: DryRunDetails;
  template_errors?: string[];
}

export interface DryRunCondition {
  path: string;
  condition: string;
  alias?: string;
  result: DryRunConditionResult;
  error?: string;
  details?: DryRunDetails;
  template_errors?: string[];
  conditions?: DryRunCondition[];
}

export interface DryRunResult {
  entity_id?: string;
  enabled: boolean;
  mode: string;
  current_runs: number;
  max_runs: number | null;
  would_run: boolean | null;
  reason: DryRunReason | null;
  variables_error?: string;
  triggers: DryRunTrigger[];
  conditions_result: DryRunConditionResult;
  conditions: DryRunCondition[];
}

export const dryRunAutomationConfig = (
  callWS: HomeAssistantApi["callWS"],
  config: AutomationConfig
) => callWS<DryRunResult>({ type: "automation/dry_run", config });

type ConditionNode = Exclude<Condition, string> & Record<string, any>;

const COMPOUND_KEYS = ["and", "or", "not"] as const;

const conditionChildren = (
  condition: Condition | undefined
): Condition[] | undefined => {
  if (!condition || typeof condition === "string") {
    return undefined;
  }
  const node = condition as ConditionNode;
  if (node.conditions !== undefined) {
    return ensureArray(node.conditions);
  }
  const shorthand = COMPOUND_KEYS.find((key) => key in node);
  return shorthand ? ensureArray(node[shorthand]) : undefined;
};

/**
 * Find the condition config a dry run path such as
 * `condition/3/conditions/1` points to.
 */
export const conditionAtPath = (
  config: AutomationConfig,
  path: string
): Condition | undefined => {
  const parts = path.split("/");
  if (parts[0] !== "condition") {
    return undefined;
  }
  let siblings: Condition[] | undefined = config.conditions
    ? ensureArray(config.conditions)
    : undefined;
  let current: Condition | undefined;
  for (let i = 1; i < parts.length; i += 2) {
    current = siblings?.[Number(parts[i])];
    siblings = conditionChildren(current);
  }
  return current;
};

export const triggerAtIndex = (
  config: AutomationConfig,
  idx: string
): Trigger | undefined =>
  config.triggers ? ensureArray(config.triggers)[Number(idx)] : undefined;

export type DryRunDetailLine =
  | {
      type: "state";
      ok: boolean;
      entityId?: string;
      actual: unknown;
      wanted?: unknown;
    }
  | {
      type: "state_since";
      ok: boolean;
      entityId?: string;
      actual: unknown;
      since: string;
    }
  | {
      type: "numeric";
      ok: boolean;
      entityId?: string;
      actual: unknown;
      above?: number;
      below?: number;
    }
  | { type: "time"; now: string; after: string; before: string }
  | { type: "weekday"; now: string; wanted: string[] }
  | { type: "template_entities"; entities: string[] }
  | { type: "message"; message: string };

const staticNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

const subResultLine = (
  sub: DryRunSubResult,
  entityId: string | undefined,
  numeric: boolean,
  config: Record<string, any> | undefined
): DryRunDetailLine => {
  if (sub.message !== undefined) {
    return { type: "message", message: sub.message };
  }
  if (sub.duration !== undefined) {
    return {
      type: "state_since",
      ok: sub.result,
      entityId,
      actual: sub.state,
      since: sub.duration,
    };
  }
  if (numeric) {
    // A passing check only reports the value, the range comes from the config
    return {
      type: "numeric",
      ok: sub.result,
      entityId,
      actual: sub.state,
      above: sub.wanted_state_above ?? staticNumber(config?.above),
      below: sub.wanted_state_below ?? staticNumber(config?.below),
    };
  }
  return {
    type: "state",
    ok: sub.result,
    entityId,
    actual: sub.state,
    wanted: sub.wanted_state,
  };
};

/**
 * Turn the trace details of a dry run node into lines that explain the
 * result, using the editor config to name the entities they belong to.
 */
// Core sends times like "18:48:28.214260"; seconds only add noise here.
const hoursMinutes = (time: string): string =>
  /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : time;

export const dryRunDetailLines = (
  type: string,
  details: DryRunDetails | undefined,
  config: Condition | Trigger | undefined
): DryRunDetailLine[] => {
  if (!details) {
    return [];
  }
  const configNode =
    config && typeof config !== "string"
      ? (config as Record<string, any>)
      : undefined;
  const entityIds: string[] = configNode?.entity_id
    ? ensureArray(configNode.entity_id)
    : [];
  const numeric = type === "numeric_state";
  const lines: DryRunDetailLine[] = [];

  for (const [path, sub] of Object.entries(details.sub_results ?? {})) {
    const [key, index] = path.split("/");
    const entityId = key === "entity_id" ? entityIds[Number(index)] : undefined;
    lines.push(subResultLine(sub, entityId, numeric, configNode));
  }
  if (
    details.now_time !== undefined &&
    details.after !== undefined &&
    details.before !== undefined
  ) {
    lines.push({
      type: "time",
      now: hoursMinutes(details.now_time),
      after: hoursMinutes(details.after),
      before: hoursMinutes(details.before),
    });
  }
  if (details.now_weekday !== undefined && details.weekday !== undefined) {
    lines.push({
      type: "weekday",
      now: details.now_weekday,
      wanted: ensureArray(details.weekday),
    });
  }
  if (details.entities?.length) {
    lines.push({ type: "template_entities", entities: details.entities });
  }
  return lines;
};
