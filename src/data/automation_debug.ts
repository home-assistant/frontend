import { HomeAssistant, Context } from "../types";
import { AutomationConfig } from "./automation";

interface BaseTrace {
  timestamp: string;
  changed_variables: Record<string, unknown>;
}

interface ConditionTrace extends BaseTrace {
  result: { result: boolean };
}

export interface AutomationTrace {
  last_action: string | null;
  last_condition: string | null;
  run_id: string;
  state: "running" | "stopped";
  timestamp: {
    start: string;
    finish: string | null;
  };
  trigger: unknown;
  unique_id: string;
}

export interface AutomationTraceExtended extends AutomationTrace {
  condition_trace: Record<string, ConditionTrace[]>;
  action_trace: Record<string, BaseTrace[]>;
  context: Context;
  variables: Record<string, unknown>;
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
  hass: HomeAssistant
): Promise<AutomationTrace[]> =>
  hass.callWS({
    type: "automation/trace/list",
  });
