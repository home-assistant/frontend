import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { computeObjectId } from "../common/entity/compute_object_id";
import { navigate } from "../common/navigate";
import { HomeAssistant } from "../types";
import { Condition } from "./automation";

export const MODES = ["single", "restart", "queued", "parallel"];
export const MODES_MAX = ["queued", "parallel"];

export interface ScriptEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    last_triggered: string;
    mode: "single" | "restart" | "queued" | "parallel";
    current?: number;
    max?: number;
  };
}

export interface ScriptConfig {
  alias: string;
  sequence: Action[];
  mode?: "single" | "restart" | "queued" | "parallel";
  max?: number;
}

export interface EventAction {
  event: string;
  event_data?: { [key: string]: any };
  event_data_template?: { [key: string]: any };
}

export interface ServiceAction {
  service: string;
  entity_id?: string;
  data?: { [key: string]: any };
}

export interface DeviceAction {
  device_id: string;
  domain: string;
  entity_id: string;
}

export interface DelayAction {
  delay: number;
}

export interface SceneAction {
  scene: string;
}

export interface WaitAction {
  wait_template: string;
  timeout?: number;
}

export type Action =
  | EventAction
  | DeviceAction
  | ServiceAction
  | Condition
  | DelayAction
  | SceneAction
  | WaitAction;

export const triggerScript = (
  hass: HomeAssistant,
  entityId: string,
  variables?: {}
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
