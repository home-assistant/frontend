import { HomeAssistant } from "../types";
import { computeObjectId } from "../common/entity/compute_object_id";
import { Condition } from "./automation";
import {
  HassEntityBase,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";

export interface ScriptEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    last_triggered: string;
  };
}

export interface ScriptConfig {
  alias: string;
  sequence: Action[];
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

export const deleteScript = (hass: HomeAssistant, objectId: string) =>
  hass.callApi("DELETE", `config/script/config/${objectId}`);
