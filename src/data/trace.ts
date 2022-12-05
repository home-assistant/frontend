import { strStartsWith } from "../common/string/starts-with";
import { Context, HomeAssistant } from "../types";
import {
  BlueprintAutomationConfig,
  ManualAutomationConfig,
} from "./automation";
import { BlueprintScriptConfig, ScriptConfig } from "./script";

interface BaseTraceStep {
  path: string;
  timestamp: string;
  error?: string;
  changed_variables?: Record<string, unknown>;
}

export interface TriggerTraceStep extends BaseTraceStep {
  changed_variables: {
    trigger: {
      alias?: string;
      description: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface ConditionTraceStep extends BaseTraceStep {
  result?: { result: boolean };
}

export interface CallServiceActionTraceStep extends BaseTraceStep {
  result?: {
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

export interface ChooseActionTraceStep extends BaseTraceStep {
  result?: { choice: number | "default" };
}

export interface IfActionTraceStep extends BaseTraceStep {
  result?: { choice: "then" | "else" };
}

export interface StopActionTraceStep extends BaseTraceStep {
  result?: { stop: string; error: boolean };
}

export interface ChooseChoiceActionTraceStep extends BaseTraceStep {
  result?: { result: boolean };
}

export type ActionTraceStep =
  | BaseTraceStep
  | ConditionTraceStep
  | CallServiceActionTraceStep
  | ChooseActionTraceStep
  | ChooseChoiceActionTraceStep;

interface BaseTrace {
  domain: string;
  item_id: string;
  last_step: string | null;
  run_id: string;
  state: "running" | "stopped" | "debugged";
  timestamp: {
    start: string;
    finish: string | null;
  };
  script_execution:
    | // The script was not executed because the automation's condition failed
    "failed_conditions"
    // The script was not executed because the run mode is single
    | "failed_single"
    // The script was not executed because max parallel runs would be exceeded
    | "failed_max_runs"
    // All script steps finished:
    | "finished"
    // Script execution stopped by the script itself because a condition fails, wait_for_trigger timeouts etc:
    | "aborted"
    // Details about failing condition, timeout etc. is in the last element of the trace
    // Script execution stops because of an unexpected exception:
    | "error"
    // The exception is in the trace itself or in the last element of the trace
    // Script execution stopped by async_stop called on the script run because home assistant is shutting down, script mode is SCRIPT_MODE_RESTART etc:
    | "cancelled";
}

interface BaseTraceExtended {
  trace: Record<string, ActionTraceStep[]>;
  context: Context;
  error?: string;
}

export interface AutomationTrace extends BaseTrace {
  domain: "automation";
  trigger: string;
}

export interface AutomationTraceExtended
  extends AutomationTrace,
    BaseTraceExtended {
  config: ManualAutomationConfig;
  blueprint_inputs?: BlueprintAutomationConfig;
}

export interface ScriptTrace extends BaseTrace {
  domain: "script";
}

export interface ScriptTraceExtended extends ScriptTrace, BaseTraceExtended {
  config: ScriptConfig;
  blueprint_inputs?: BlueprintScriptConfig;
}

export type TraceExtended = AutomationTraceExtended | ScriptTraceExtended;

interface TraceTypes {
  automation: {
    short: AutomationTrace;
    extended: AutomationTraceExtended;
  };
  script: {
    short: ScriptTrace;
    extended: ScriptTraceExtended;
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
  config: TraceExtended["config"],
  path: string
): any => {
  const parts = path.split("/").reverse();

  let result: any = config;

  while (parts.length) {
    const raw = parts.pop()!;
    const asNumber = Number(raw);

    if (isNaN(asNumber)) {
      const tempResult = result[raw];
      if (!tempResult && raw === "sequence") {
        continue;
      }
      result = tempResult;
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

// It is 'trigger' if manually triggered by the user via UI
export const isTriggerPath = (path: string): boolean =>
  path === "trigger" || strStartsWith(path, "trigger/");

export const getTriggerPathFromTrace = (
  steps: Record<string, BaseTraceStep[]>
): string | undefined => Object.keys(steps).find((path) => isTriggerPath(path));
