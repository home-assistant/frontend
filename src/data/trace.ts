import { HomeAssistant, Context } from "../types";
import { AutomationConfig } from "./automation";

interface TraceVariables extends Record<string, unknown> {
  trigger: {
    description: string;
    [key: string]: unknown;
  };
}

interface BaseTrace {
  path: string;
  timestamp: string;
  changed_variables?: Record<string, unknown>;
}

export interface ConditionTrace extends BaseTrace {
  result: { result: boolean };
}

export interface CallServiceActionTrace extends BaseTrace {
  result: {
    limit: number;
    running_script: boolean;
    params: Record<string, unknown>;
  };
  child_id?: {
    domain: string;
    item_id: string;
    run_id: string;
  };
}

export interface ChooseActionTrace extends BaseTrace {
  result: { choice: number | "default" };
}

export interface ChooseChoiceActionTrace extends BaseTrace {
  result: { result: boolean };
}

export type ActionTrace =
  | BaseTrace
  | CallServiceActionTrace
  | ChooseActionTrace
  | ChooseChoiceActionTrace;

export interface AutomationTrace {
  domain: string;
  item_id: string;
  last_action: string | null;
  last_condition: string | null;
  run_id: string;
  state: "running" | "stopped" | "debugged";
  timestamp: {
    start: string;
    finish: string | null;
  };
  trigger: unknown;
}

export interface AutomationTraceExtended extends AutomationTrace {
  condition_trace: Record<string, ConditionTrace[]>;
  action_trace: Record<string, ActionTrace[]>;
  context: Context;
  variables: TraceVariables;
  config: AutomationConfig;
}

interface TraceTypes {
  automation: {
    short: AutomationTrace;
    extended: AutomationTraceExtended;
  };
}

export const loadTrace = <T extends keyof TraceTypes>(
  hass: HomeAssistant,
  domain: T,
  item_id: string,
  run_id: string
): Promise<TraceTypes[T]["extended"]> =>
  hass.callWS({
    type: "trace/get",
    domain,
    item_id,
    run_id,
  });

export const loadTraces = <T extends keyof TraceTypes>(
  hass: HomeAssistant,
  domain: T,
  item_id: string
): Promise<Array<TraceTypes[T]["short"]>> =>
  hass.callWS({
    type: "trace/list",
    domain,
    item_id,
  });

export type TraceContexts = Record<
  string,
  { run_id: string; domain: string; item_id: string }
>;

export const loadTraceContexts = (
  hass: HomeAssistant,
  domain?: string,
  item_id?: string
): Promise<TraceContexts> =>
  hass.callWS({
    type: "trace/contexts",
    domain,
    item_id,
  });

export const getDataFromPath = (
  config: AutomationConfig,
  path: string
): any => {
  const parts = path.split("/").reverse();

  let result: any = config;

  while (parts.length) {
    const raw = parts.pop()!;
    const asNumber = Number(raw);

    if (isNaN(asNumber)) {
      result = result[raw];
      continue;
    }

    if (Array.isArray(result)) {
      result = result[asNumber];
      continue;
    }

    if (asNumber !== 0) {
      throw new Error("If config is not an array, can only return index 0");
    }
  }

  return result;
};
