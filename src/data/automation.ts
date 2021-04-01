import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { navigate } from "../common/navigate";
import { Context, HomeAssistant } from "../types";
import { BlueprintInput } from "./blueprint";
import { DeviceCondition, DeviceTrigger } from "./device_automation";
import { Action, MODES } from "./script";

export interface AutomationEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    id?: string;
    last_triggered: string;
  };
}

export type AutomationConfig =
  | ManualAutomationConfig
  | BlueprintAutomationConfig;

export interface ManualAutomationConfig {
  id?: string;
  alias?: string;
  description?: string;
  trigger: Trigger[];
  condition?: Condition[];
  action: Action[];
  mode?: typeof MODES[number];
  max?: number;
  max_exceeded?:
    | "silent"
    | "critical"
    | "fatal"
    | "error"
    | "warning"
    | "warn"
    | "info"
    | "debug"
    | "notset";
  variables?: Record<string, unknown>;
}

export interface BlueprintAutomationConfig extends ManualAutomationConfig {
  use_blueprint: { path: string; input?: BlueprintInput };
}

export interface ForDict {
  hours?: number | string;
  minutes?: number | string;
  seconds?: number | string;
}

export interface StateTrigger {
  platform: "state";
  entity_id: string;
  attribute?: string;
  from?: string | number;
  to?: string | string[] | number;
  for?: string | number | ForDict;
}

export interface MqttTrigger {
  platform: "mqtt";
  topic: string;
  payload?: string;
}

export interface GeoLocationTrigger {
  platform: "geo_location";
  source: string;
  zone: string;
  event: "enter" | "leave";
}

export interface HassTrigger {
  platform: "homeassistant";
  event: "start" | "shutdown";
}

export interface NumericStateTrigger {
  platform: "numeric_state";
  entity_id: string;
  attribute?: string;
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

export interface TagTrigger {
  platform: "tag";
  tag_id: string;
  device_id?: string;
}

export interface TimeTrigger {
  platform: "time";
  at: string;
}

export interface TemplateTrigger {
  platform: "template";
  value_template: string;
}

export interface ContextConstraint {
  context_id?: string;
  parent_id?: string;
  user_id?: string | string[];
}

export interface EventTrigger {
  platform: "event";
  event_type: string;
  event_data?: any;
  context?: ContextConstraint;
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
  | TagTrigger
  | TimeTrigger
  | TemplateTrigger
  | EventTrigger
  | DeviceTrigger;

export interface LogicalCondition {
  condition: "and" | "not" | "or";
  alias?: string;
  conditions: Condition[];
}

export interface StateCondition {
  condition: "state";
  alias?: string;
  entity_id: string;
  attribute?: string;
  state: string | number;
  for?: string | number | ForDict;
}

export interface NumericStateCondition {
  condition: "numeric_state";
  alias?: string;
  entity_id: string;
  attribute?: string;
  above?: number;
  below?: number;
  value_template?: string;
}

export interface SunCondition {
  condition: "sun";
  alias?: string;
  after_offset: number;
  before_offset: number;
  after: "sunrise" | "sunset";
  before: "sunrise" | "sunset";
}

export interface ZoneCondition {
  condition: "zone";
  alias?: string;
  entity_id: string;
  zone: string;
}

export interface TimeCondition {
  condition: "time";
  alias?: string;
  after?: string;
  before?: string;
  weekday?: string | string[];
}

export interface TemplateCondition {
  condition: "template";
  alias?: string;
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

export const triggerAutomationActions = (
  hass: HomeAssistant,
  entityId: string
) => {
  hass.callService("automation", "trigger", {
    entity_id: entityId,
    skip_condition: true,
  });
};

export const deleteAutomation = (hass: HomeAssistant, id: string) =>
  hass.callApi("DELETE", `config/automation/config/${id}`);

let inititialAutomationEditorData: Partial<AutomationConfig> | undefined;

export const getAutomationConfig = (hass: HomeAssistant, id: string) =>
  hass.callApi<AutomationConfig>("GET", `config/automation/config/${id}`);

export const showAutomationEditor = (
  el: HTMLElement,
  data?: Partial<AutomationConfig>
) => {
  inititialAutomationEditorData = data;
  navigate(el, "/config/automation/edit/new");
};

export const getAutomationEditorInitData = () => {
  const data = inititialAutomationEditorData;
  inititialAutomationEditorData = undefined;
  return data;
};

export const subscribeTrigger = (
  hass: HomeAssistant,
  onChange: (result: {
    variables: {
      trigger: Record<string, unknown>;
    };
    context: Context;
  }) => void,
  trigger: Trigger | Trigger[],
  variables?: Record<string, unknown>
) =>
  hass.connection.subscribeMessage(onChange, {
    type: "subscribe_trigger",
    trigger,
    variables,
  });

export const testCondition = (
  hass: HomeAssistant,
  condition: Condition | Condition[],
  variables?: Record<string, unknown>
) =>
  hass.callWS<{ result: boolean }>({
    type: "test_condition",
    condition,
    variables,
  });
