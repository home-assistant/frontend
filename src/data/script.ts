import {
  HassEntityAttributeBase,
  HassEntityBase,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import {
  object,
  optional,
  string,
  union,
  array,
  assign,
  literal,
  is,
  Describe,
} from "superstruct";
import { computeObjectId } from "../common/entity/compute_object_id";
import { navigate } from "../common/navigate";
import { HomeAssistant } from "../types";
import { Condition, Trigger } from "./automation";
import { BlueprintInput } from "./blueprint";

export const MODES = ["single", "restart", "queued", "parallel"] as const;
export const MODES_MAX = ["queued", "parallel"];

export const baseActionStruct = object({
  alias: optional(string()),
});

const targetStruct = object({
  entity_id: optional(union([string(), array(string())])),
  device_id: optional(union([string(), array(string())])),
  area_id: optional(union([string(), array(string())])),
});

export const serviceActionStruct: Describe<ServiceAction> = assign(
  baseActionStruct,
  object({
    service: optional(string()),
    service_template: optional(string()),
    entity_id: optional(string()),
    target: optional(targetStruct),
    data: optional(object()),
  })
);

const playMediaActionStruct: Describe<PlayMediaAction> = assign(
  baseActionStruct,
  object({
    service: literal("media_player.play_media"),
    target: optional(object({ entity_id: optional(string()) })),
    entity_id: optional(string()),
    data: object({ media_content_id: string(), media_content_type: string() }),
    metadata: object(),
  })
);

const activateSceneActionStruct: Describe<ServiceSceneAction> = assign(
  baseActionStruct,
  object({
    service: literal("scene.turn_on"),
    target: optional(object({ entity_id: optional(string()) })),
    entity_id: optional(string()),
    metadata: object(),
  })
);

export interface ScriptEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    last_triggered: string;
    mode: typeof MODES[number];
    current?: number;
    max?: number;
  };
}

export type ScriptConfig = ManualScriptConfig | BlueprintScriptConfig;

export interface ManualScriptConfig {
  alias: string;
  sequence: Action | Action[];
  icon?: string;
  mode?: typeof MODES[number];
  max?: number;
}

export interface BlueprintScriptConfig extends ManualScriptConfig {
  use_blueprint: { path: string; input?: BlueprintInput };
}

export interface EventAction {
  alias?: string;
  event: string;
  event_data?: Record<string, any>;
  event_data_template?: Record<string, any>;
}

export interface ServiceAction {
  alias?: string;
  service?: string;
  service_template?: string;
  entity_id?: string;
  target?: HassServiceTarget;
  data?: Record<string, unknown>;
}

export interface DeviceAction {
  alias?: string;
  type: string;
  device_id: string;
  domain: string;
  entity_id: string;
}

export interface DelayActionParts {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}
export interface DelayAction {
  alias?: string;
  delay: number | Partial<DelayActionParts> | string;
}

export interface ServiceSceneAction {
  alias?: string;
  service: "scene.turn_on";
  target?: { entity_id?: string };
  entity_id?: string;
  metadata: Record<string, unknown>;
}
export interface LegacySceneAction {
  alias?: string;
  scene: string;
}
export type SceneAction = ServiceSceneAction | LegacySceneAction;

export interface WaitAction {
  alias?: string;
  wait_template: string;
  timeout?: number;
  continue_on_timeout?: boolean;
}

export interface WaitForTriggerAction {
  alias?: string;
  wait_for_trigger: Trigger | Trigger[];
  timeout?: number;
  continue_on_timeout?: boolean;
}

export interface PlayMediaAction {
  alias?: string;
  service: "media_player.play_media";
  target?: { entity_id?: string };
  entity_id?: string;
  data: { media_content_id: string; media_content_type: string };
  metadata: Record<string, unknown>;
}

export interface RepeatAction {
  alias?: string;
  repeat: CountRepeat | WhileRepeat | UntilRepeat;
}

interface BaseRepeat {
  alias?: string;
  sequence: Action | Action[];
}

export interface CountRepeat extends BaseRepeat {
  count: number;
}

export interface WhileRepeat extends BaseRepeat {
  while: Condition[];
}

export interface UntilRepeat extends BaseRepeat {
  until: Condition[];
}

export interface ChooseActionChoice {
  alias?: string;
  conditions: string | Condition[];
  sequence: Action | Action[];
}

export interface ChooseAction {
  alias?: string;
  choose: ChooseActionChoice | ChooseActionChoice[] | null;
  default?: Action | Action[];
}

export interface VariablesAction {
  alias?: string;
  variables: Record<string, unknown>;
}

interface UnknownAction {
  alias?: string;
  [key: string]: unknown;
}

export type Action =
  | EventAction
  | DeviceAction
  | ServiceAction
  | Condition
  | DelayAction
  | SceneAction
  | WaitAction
  | WaitForTriggerAction
  | RepeatAction
  | ChooseAction
  | VariablesAction
  | PlayMediaAction
  | UnknownAction;

export interface ActionTypes {
  delay: DelayAction;
  wait_template: WaitAction;
  check_condition: Condition;
  fire_event: EventAction;
  device_action: DeviceAction;
  activate_scene: SceneAction;
  repeat: RepeatAction;
  choose: ChooseAction;
  wait_for_trigger: WaitForTriggerAction;
  variables: VariablesAction;
  service: ServiceAction;
  play_media: PlayMediaAction;
  unknown: UnknownAction;
}

export type ActionType = keyof ActionTypes;

export const triggerScript = (
  hass: HomeAssistant,
  entityId: string,
  variables?: Record<string, unknown>
) => hass.callService("script", computeObjectId(entityId), variables);

export const canRun = (state: ScriptEntity) => {
  if (state.state === "off") {
    return true;
  }
  if (
    state.state === "on" &&
    MODES_MAX.includes(state.attributes.mode) &&
    state.attributes.current! < state.attributes.max!
  ) {
    return true;
  }
  return false;
};

export const deleteScript = (hass: HomeAssistant, objectId: string) =>
  hass.callApi("DELETE", `config/script/config/${objectId}`);

let inititialScriptEditorData: Partial<ScriptConfig> | undefined;

export const showScriptEditor = (data?: Partial<ScriptConfig>) => {
  inititialScriptEditorData = data;
  navigate("/config/script/edit/new");
};

export const getScriptEditorInitData = () => {
  const data = inititialScriptEditorData;
  inititialScriptEditorData = undefined;
  return data;
};

export const getActionType = (action: Action): ActionType => {
  // Check based on config_validation.py#determine_script_action
  if ("delay" in action) {
    return "delay";
  }
  if ("wait_template" in action) {
    return "wait_template";
  }
  if ("condition" in action) {
    return "check_condition";
  }
  if ("event" in action) {
    return "fire_event";
  }
  if ("device_id" in action) {
    return "device_action";
  }
  if ("scene" in action) {
    return "activate_scene";
  }
  if ("repeat" in action) {
    return "repeat";
  }
  if ("choose" in action) {
    return "choose";
  }
  if ("wait_for_trigger" in action) {
    return "wait_for_trigger";
  }
  if ("variables" in action) {
    return "variables";
  }
  if ("service" in action) {
    if ("metadata" in action) {
      if (is(action, activateSceneActionStruct)) {
        return "activate_scene";
      }
      if (is(action, playMediaActionStruct)) {
        return "play_media";
      }
    }
    return "service";
  }
  return "unknown";
};
