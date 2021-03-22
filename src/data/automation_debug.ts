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
}

export interface ChooseActionTrace extends BaseTrace {
  result: { choice: number };
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
  automation_id: string;
  unique_id: string;
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

export const loadAutomationTrace = (
  hass: HomeAssistant,
  automation_id: string,
  run_id: string
): Promise<AutomationTraceExtended> =>
  hass.callWS({
    type: "automation/trace/get",
    automation_id,
    run_id,
  });

export const loadAutomationTraces = (
  hass: HomeAssistant,
  automation_id?: string
): Promise<AutomationTrace[]> =>
  hass.callWS({
    type: "automation/trace/list",
    automation_id,
  });

export type AutomationTraceContexts = Record<
  string,
  { run_id: string; automation_id: string }
>;

export const loadAutomationTraceContexts = (
  hass: HomeAssistant,
  automation_id?: string
): Promise<AutomationTraceContexts> =>
  hass.callWS({
    type: "automation/trace/contexts",
    automation_id,
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
