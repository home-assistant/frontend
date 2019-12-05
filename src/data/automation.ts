import {
  HassEntityBase,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";
import { navigate } from "../common/navigate";
import { DeviceCondition, DeviceTrigger } from "./device_automation";

export interface AutomationEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    id?: string;
    last_triggered: string;
  };
}

export interface AutomationConfig {
  alias: string;
  description: string;
  trigger: Trigger[];
  condition?: Condition[];
  action: any[];
}

export interface ForDict {
  hours?: number | string;
  minutes?: number | string;
  seconds?: number | string;
}

export interface StateTrigger {
  platform: "state";
  entity_id?: string;
  from?: string | number;
  to?: string | number;
  for?: string | number | ForDict;
}

export interface MqttTrigger {
  platform: "mqtt";
  topic: string;
  payload?: string;
}

export interface GeoLocationTrigger {
  platform: "geo_location";
  source: "string";
  zone: "string";
  event: "enter" | "leave";
}

export interface HassTrigger {
  platform: "homeassistant";
  event: "start" | "shutdown";
}

export interface NumericStateTrigger {
  platform: "numeric_state";
  entity_id: string;
  above?: number;
  below?: number;
  value_template?: string;
  for?: string | number | ForDict;
}

export interface SunTrigger {
  platform: "sun";
  offset: number;
  event: "sunrise" | "sunset";
}

export interface TimePatternTrigger {
  platform: "time_pattern";
  hours?: number | string;
  minutes?: number | string;
  seconds?: number | string;
}

export interface WebhookTrigger {
  platform: "webhook";
  webhook_id: string;
}

export interface ZoneTrigger {
  platform: "zone";
  entity_id: string;
  zone: string;
  event: "enter" | "leave";
}

export interface TimeTrigger {
  platform: "time";
  at: string;
}

export interface TemplateTrigger {
  platform: "template";
  value_template: string;
}

export interface EventTrigger {
  platform: "event";
  event_type: string;
  event_data: any;
}

export type Trigger =
  | StateTrigger
  | MqttTrigger
  | GeoLocationTrigger
  | HassTrigger
  | NumericStateTrigger
  | SunTrigger
  | TimePatternTrigger
  | WebhookTrigger
  | ZoneTrigger
  | TimeTrigger
  | TemplateTrigger
  | EventTrigger
  | DeviceTrigger;

export interface LogicalCondition {
  condition: "and" | "or";
  conditions: Condition[];
}

export interface StateCondition {
  condition: "state";
  entity_id: string;
  state: string | number;
}

export interface NumericStateCondition {
  condition: "numeric_state";
  entity_id: string;
  above?: number;
  below?: number;
  value_template?: string;
}

export interface SunCondition {
  condition: "sun";
  after_offset: number;
  before_offset: number;
  after: "sunrise" | "sunset";
  before: "sunrise" | "sunset";
}

export interface ZoneCondition {
  condition: "zone";
  entity_id: string;
  zone: string;
}

export interface TimeCondition {
  condition: "time";
  after: string;
  before: string;
}

export interface TemplateCondition {
  condition: "template";
  value_template: string;
}

export type Condition =
  | StateCondition
  | NumericStateCondition
  | SunCondition
  | ZoneCondition
  | TimeCondition
  | TemplateCondition
  | DeviceCondition
  | LogicalCondition;

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

export const deleteAutomation = (hass: HomeAssistant, id: string) =>
  hass.callApi("DELETE", `config/automation/config/${id}`);

let inititialAutomationEditorData: Partial<AutomationConfig> | undefined;

export const showAutomationEditor = (
  el: HTMLElement,
  data?: Partial<AutomationConfig>
) => {
  inititialAutomationEditorData = data;
  navigate(el, "/config/automation/new");
};

export const getAutomationEditorInitData = () => {
  const data = inititialAutomationEditorData;
  inititialAutomationEditorData = undefined;
  return data;
};
