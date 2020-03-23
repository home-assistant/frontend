import {
  HassEntityBase,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";
import { navigate } from "../common/navigate";
import { DeviceCondition, DeviceTrigger } from "./device_automation";
import { Action } from "./script";

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
  action: Action[];
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

export interface WeekdayCondition {
  condition: "weekday";
  days: string[];
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
  | WeekdayCondition
  | TemplateCondition
  | DeviceCondition
  | LogicalCondition;

export const triggerAutomation = (hass: HomeAssistant, entityId: string) => {
  hass.callService("automation", "trigger", {
    entity_id: entityId,
  });
};

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
