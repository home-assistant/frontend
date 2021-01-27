import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { computeObjectId } from "../common/entity/compute_object_id";
import { navigate } from "../common/navigate";
import { HomeAssistant } from "../types";
import { Condition, Trigger } from "./automation";

export const MODES = ["single", "restart", "queued", "parallel"] as const;
export const MODES_MAX = ["queued", "parallel"];

export interface ScriptEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    last_triggered: string;
    mode: typeof MODES[number];
    current?: number;
    max?: number;
  };
}

export interface ScriptConfig {
  alias: string;
  sequence: Action[];
  icon?: string;
  mode?: typeof MODES[number];
  max?: number;
}

export interface EventAction {
  event: string;
  event_data?: Record<string, any>;
  event_data_template?: Record<string, any>;
}

export interface ServiceAction {
  service: string;
  entity_id?: string;
  data?: Record<string, any>;
}

export interface DeviceAction {
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
  delay: number | Partial<DelayActionParts>;
}

export interface SceneAction {
  scene: string;
}

export interface WaitAction {
  wait_template: string;
  timeout?: number;
  continue_on_timeout?: boolean;
}

export interface WaitForTriggerAction {
  wait_for_trigger: Trigger[];
  timeout?: number;
  continue_on_timeout?: boolean;
}

export interface RepeatAction {
  repeat: CountRepeat | WhileRepeat | UntilRepeat;
}

interface BaseRepeat {
  sequence: Action[];
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

export interface ChooseAction {
  choose: [{ conditions: Condition[]; sequence: Action[] }];
  default?: Action[];
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
  | ChooseAction;

export const triggerScript = (
  hass: HomeAssistant,
  entityId: string,
  variables?: Record<string, unknown>
) => hass.callService("script", computeObjectId(entityId), variables);

export const canExcecute = (state: ScriptEntity) => {
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

export const showScriptEditor = (
  el: HTMLElement,
  data?: Partial<ScriptConfig>
) => {
  inititialScriptEditorData = data;
  navigate(el, "/config/script/edit/new");
};

export const getScriptEditorInitData = () => {
  const data = inititialScriptEditorData;
  inititialScriptEditorData = undefined;
  return data;
};
