import type {
  HassEntityAttributeBase,
  HassEntityBase,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import type { Describe } from "superstruct";
import {
  array,
  assign,
  boolean,
  object,
  optional,
  refine,
  string,
  union,
} from "superstruct";
import { arrayLiteralIncludes } from "../common/array/literal-includes";
import { computeObjectId } from "../common/entity/compute_object_id";
import { navigate } from "../common/navigate";
import { hasTemplate } from "../common/string/has-template";
import { createSearchParam } from "../common/url/search-params";
import type { HomeAssistant } from "../types";
import type {
  Condition,
  ShorthandAndCondition,
  ShorthandNotCondition,
  ShorthandOrCondition,
  Trigger,
} from "./automation";
import { migrateAutomationTrigger } from "./automation";
import type { BlueprintInput } from "./blueprint";

export const MODES = ["single", "restart", "queued", "parallel"] as const;
export const MODES_MAX = ["queued", "parallel"] as const;
export const isMaxMode = arrayLiteralIncludes(MODES_MAX);

export const baseActionStruct = object({
  alias: optional(string()),
  continue_on_error: optional(boolean()),
  enabled: optional(boolean()),
});

export const targetStruct = object({
  entity_id: optional(union([string(), array(string())])),
  device_id: optional(union([string(), array(string())])),
  area_id: optional(union([string(), array(string())])),
  floor_id: optional(union([string(), array(string())])),
  label_id: optional(union([string(), array(string())])),
});

export const serviceActionStruct: Describe<ServiceActionWithTemplate> = assign(
  baseActionStruct,
  object({
    action: optional(string()),
    service_template: optional(string()),
    entity_id: optional(string()),
    target: optional(
      union([
        targetStruct,
        refine(string(), "has_template", (val) => hasTemplate(val)),
      ])
    ),
    data: optional(object()),
    response_variable: optional(string()),
    metadata: optional(object()),
  })
);

export interface ScriptEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    last_triggered: string;
    mode: (typeof MODES)[number];
    current?: number;
    max?: number;
  };
}

export type ScriptConfig = ManualScriptConfig | BlueprintScriptConfig;

export interface ManualScriptConfig {
  alias: string;
  description?: string;
  sequence: Action | Action[];
  icon?: string;
  mode?: (typeof MODES)[number];
  max?: number;
  fields?: Fields;
}

export interface BlueprintScriptConfig extends ManualScriptConfig {
  use_blueprint: { path: string; input?: BlueprintInput };
}

export type Fields = Record<string, Field>;

export interface Field {
  name?: string;
  description?: string;
  advanced?: boolean;
  required?: boolean;
  example?: string;
  default?: any;
  selector?: any;
}

interface BaseAction {
  alias?: string;
  continue_on_error?: boolean;
  enabled?: boolean;
}

export interface EventAction extends BaseAction {
  event: string;
  event_data?: Record<string, any>;
  event_data_template?: Record<string, any>;
}

export interface ServiceAction extends BaseAction {
  action?: string;
  service_template?: string;
  entity_id?: string;
  target?: HassServiceTarget;
  data?: Record<string, unknown>;
  response_variable?: string;
  metadata?: Record<string, unknown>;
}

type ServiceActionWithTemplate = ServiceAction & {
  target?: HassServiceTarget | string;
};

export type { ServiceActionWithTemplate };

export interface DeviceAction extends BaseAction {
  type: string;
  device_id: string;
  domain: string;
  entity_id: string;
}

export interface DelayActionParts extends BaseAction {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}
export interface DelayAction extends BaseAction {
  delay: number | Partial<DelayActionParts> | string;
}

export interface WaitAction extends BaseAction {
  wait_template: string;
  timeout?: number;
  continue_on_timeout?: boolean;
}

export interface WaitForTriggerActionParts extends BaseAction {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}

export interface WaitForTriggerAction extends BaseAction {
  wait_for_trigger: Trigger | Trigger[];
  timeout?: number | Partial<WaitForTriggerActionParts> | string;
  continue_on_timeout?: boolean;
}

export interface RepeatAction extends BaseAction {
  repeat: CountRepeat | WhileRepeat | UntilRepeat | ForEachRepeat;
}

interface BaseRepeat extends BaseAction {
  sequence: Action | Action[];
}

export interface CountRepeat extends BaseRepeat {
  count: number | string;
}

export interface WhileRepeat extends BaseRepeat {
  while: Condition[];
}

export interface UntilRepeat extends BaseRepeat {
  until: Condition[];
}

export interface ForEachRepeat extends BaseRepeat {
  for_each: string | any[];
}

export interface Option {
  alias?: string;
  conditions: string | Condition[];
  sequence: Action | Action[];
}

export interface ChooseAction extends BaseAction {
  choose: Option | Option[] | null;
  default?: Action | Action[];
}

export interface IfAction extends BaseAction {
  if: string | Condition[];
  then: Action | Action[];
  else?: Action | Action[];
}

export interface VariablesAction extends BaseAction {
  variables: Record<string, unknown>;
}

export interface StopAction extends BaseAction {
  stop: string;
  response_variable?: string;
  error?: boolean;
}

export interface SequenceAction extends BaseAction {
  sequence: (ManualScriptConfig | Action)[];
}

export interface ParallelAction extends BaseAction {
  parallel: ManualScriptConfig | Action | (ManualScriptConfig | Action)[];
}

export interface SetConversationResponseAction extends BaseAction {
  set_conversation_response: string;
}

interface UnknownAction extends BaseAction, Record<string, unknown> {}

export type NonConditionAction =
  | EventAction
  | DeviceAction
  | ServiceAction
  | DelayAction
  | WaitAction
  | WaitForTriggerAction
  | RepeatAction
  | ChooseAction
  | IfAction
  | VariablesAction
  | StopAction
  | SequenceAction
  | ParallelAction
  | UnknownAction;

export type Action =
  | NonConditionAction
  | Condition
  | ShorthandAndCondition
  | ShorthandOrCondition
  | ShorthandNotCondition;

export interface ActionTypes {
  delay: DelayAction;
  wait_template: WaitAction;
  check_condition: Condition;
  fire_event: EventAction;
  device_action: DeviceAction;
  repeat: RepeatAction;
  choose: ChooseAction;
  if: IfAction;
  wait_for_trigger: WaitForTriggerAction;
  variables: VariablesAction;
  service: ServiceAction;
  stop: StopAction;
  sequence: SequenceAction;
  parallel: ParallelAction;
  set_conversation_response: SetConversationResponseAction;
  unknown: UnknownAction;
}

export type ActionType = keyof ActionTypes;

export const triggerScript = (
  hass: HomeAssistant,
  scriptId: string,
  variables?: Record<string, unknown>
) => hass.callService("script", scriptId, variables);

export const canRun = (state: ScriptEntity) => {
  if (state.state === "off") {
    return true;
  }
  if (
    state.state === "on" &&
    isMaxMode(state.attributes.mode) &&
    state.attributes.current! < state.attributes.max!
  ) {
    return true;
  }
  return false;
};

export const deleteScript = (hass: HomeAssistant, objectId: string) =>
  hass.callApi("DELETE", `config/script/config/${objectId}`);

let inititialScriptEditorData: Partial<ScriptConfig> | undefined;

export const fetchScriptFileConfig = (hass: HomeAssistant, objectId: string) =>
  hass.callApi<ScriptConfig>("GET", `config/script/config/${objectId}`);

export const getScriptStateConfig = (hass: HomeAssistant, entity_id: string) =>
  hass.callWS<{ config: ScriptConfig }>({
    type: "script/config",
    entity_id,
  });

export const showScriptEditor = (
  data?: Partial<ScriptConfig>,
  expanded?: boolean
) => {
  inititialScriptEditorData = data;
  const params = expanded ? `?${createSearchParam({ expanded: "1" })}` : "";
  navigate(`/config/script/edit/new${params}`);
};

export const getScriptEditorInitData = () => {
  const data = inititialScriptEditorData;
  inititialScriptEditorData = undefined;
  return data;
};

export const getActionType = (action: Action): ActionType => {
  // Check based on config_validation.py#determine_script_action
  if (typeof action === "string" && hasTemplate(action)) {
    return "check_condition";
  }
  if ("delay" in action) {
    return "delay";
  }
  if ("wait_template" in action) {
    return "wait_template";
  }
  if (["condition", "and", "or", "not"].some((key) => key in action)) {
    return "check_condition";
  }
  if ("event" in action) {
    return "fire_event";
  }
  if ("device_id" in action) {
    return "device_action";
  }
  if ("repeat" in action) {
    return "repeat";
  }
  if ("choose" in action) {
    return "choose";
  }
  if ("if" in action) {
    return "if";
  }
  if ("wait_for_trigger" in action) {
    return "wait_for_trigger";
  }
  if ("variables" in action) {
    return "variables";
  }
  if ("stop" in action) {
    return "stop";
  }
  if ("sequence" in action) {
    return "sequence";
  }
  if ("parallel" in action) {
    return "parallel";
  }
  if ("set_conversation_response" in action) {
    return "set_conversation_response";
  }
  if ("action" in action || "service" in action) {
    return "service";
  }
  return "unknown";
};

export const hasScriptFields = (
  hass: HomeAssistant,
  entityId: string
): boolean => {
  const fields = hass.services.script[computeObjectId(entityId)]?.fields;
  return fields !== undefined && Object.keys(fields).length > 0;
};

export const hasRequiredScriptFields = (
  hass: HomeAssistant,
  entityId: string
): boolean => {
  const fields = hass.services.script[computeObjectId(entityId)]?.fields;
  return (
    fields !== undefined &&
    Object.values(fields).some((field) => field.required)
  );
};

export const requiredScriptFieldsFilled = (
  hass: HomeAssistant,
  entityId: string,
  data?: Record<string, any>
): boolean => {
  const fields = hass.services.script[computeObjectId(entityId)]?.fields;
  if (fields === undefined || Object.keys(fields).length === 0) {
    return true;
  }
  if (data === undefined) {
    return false;
  }
  return Object.entries(fields).every(([key, field]) => {
    if (field.required) {
      return data[key] !== undefined;
    }
    return true;
  });
};

export const migrateAutomationAction = (
  action: Action | Action[]
): Action | Action[] => {
  if (!action) {
    return action;
  }

  if (Array.isArray(action)) {
    return action.map(migrateAutomationAction) as Action[];
  }

  if (typeof action === "object" && action !== null && "service" in action) {
    if (!("action" in action)) {
      action.action = action.service;
    }
    delete action.service;
  }

  // legacy scene (scene: scene_name)
  if (typeof action === "object" && action !== null && "scene" in action) {
    action.action = "scene.turn_on";
    action.target = {
      entity_id: action.scene,
    };
    delete action.scene;
  }

  // legacy play media
  if (
    typeof action === "object" &&
    action !== null &&
    "action" in action &&
    action.action === "media_player.play_media" &&
    "data" in action &&
    ((action.data as any)?.media_content_id ||
      (action.data as any)?.media_content_type)
  ) {
    const oldData = { ...(action.data as any) };
    const media = {
      media_content_id: oldData.media_content_id,
      media_content_type: oldData.media_content_type,
      metadata: { ...(action.metadata || {}) },
    };
    delete action.metadata;
    delete oldData.media_content_id;
    delete oldData.media_content_type;
    action.data = {
      ...oldData,
      media,
    };
  }

  if (typeof action === "object" && action !== null && "sequence" in action) {
    for (const sequenceAction of (action as SequenceAction).sequence) {
      migrateAutomationAction(sequenceAction);
    }
  }

  const actionType = getActionType(action);

  if (actionType === "parallel") {
    const _action = action as ParallelAction;
    migrateAutomationAction(_action.parallel);
  }

  if (actionType === "choose") {
    const _action = action as ChooseAction;
    if (Array.isArray(_action.choose)) {
      for (const choice of _action.choose) {
        migrateAutomationAction(choice.sequence);
      }
    } else if (_action.choose) {
      migrateAutomationAction(_action.choose.sequence);
    }
    if (_action.default) {
      migrateAutomationAction(_action.default);
    }
  }

  if (actionType === "repeat") {
    const _action = action as RepeatAction;
    migrateAutomationAction(_action.repeat.sequence);
  }

  if (actionType === "if") {
    const _action = action as IfAction;
    migrateAutomationAction(_action.then);
    if (_action.else) {
      migrateAutomationAction(_action.else);
    }
  }

  if (actionType === "wait_for_trigger") {
    const _action = action as WaitForTriggerAction;
    migrateAutomationTrigger(_action.wait_for_trigger);
  }

  return action;
};

export const normalizeScriptConfig = (config: ScriptConfig): ScriptConfig => {
  // Normalize data: ensure sequence is a list
  // Happens when people copy paste their scripts into the config
  const value = config.sequence;
  if (value && !Array.isArray(value)) {
    config.sequence = [value];
  }
  if (config.sequence) {
    config.sequence = migrateAutomationAction(config.sequence);
  }
  return config;
};
