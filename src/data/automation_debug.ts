import { HomeAssistant, Context } from "../types";
import { AutomationConfig } from "./automation";

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

export interface AutomationTraceExtended
  extends Omit<AutomationTrace, "last_action" | "last_condition"> {
  action_trace: unknown;
  condition_trace: unknown;
  context: Context;
  variables: { [key: string]: unknown };
  config: AutomationConfig;
}

export const loadAutomationTrace = (
  hass: HomeAssistant,
  automation_id: string
): Promise<AutomationTraceExtended[]> =>
  hass
    .callWS({
      type: "automation/trace/get",
      automation_id,
    })
    // I disagree with the current return type of automation/trace/get
    // So patching it here to what it imo should be.
    // @ts-ignore
    .then((val) => val[automation_id]);

export const loadAutomationTraces = (
  hass: HomeAssistant
): Promise<AutomationTrace[]> =>
  hass.callWS({
    type: "automation/trace/list",
  });
