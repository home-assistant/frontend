import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { navigate } from "../common/navigate";
import { Context, HomeAssistant } from "../types";
import { BlueprintInput } from "./blueprint";
import { DeviceCondition, DeviceTrigger } from "./device_automation";
import { Action, MODES } from "./script";

export const AUTOMATION_DEFAULT_MODE: (typeof MODES)[number] = "single";
export const AUTOMATION_DEFAULT_MAX = 10;

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
  trigger: Trigger | Trigger[];
  condition?: Condition | Condition[];
  action: Action | Action[];
  mode?: (typeof MODES)[number];
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
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

export interface ContextConstraint {
  context_id?: string;
  parent_id?: string;
  user_id?: string | string[];
}

export interface BaseTrigger {
  alias?: string;
  platform: string;
  id?: string;
  variables?: Record<string, unknown>;
  enabled?: boolean;
}

export interface StateTrigger extends BaseTrigger {
  platform: "state";
  entity_id: string | string[];
  attribute?: string;
  from?: string | number;
  to?: string | string[] | number;
  for?: string | number | ForDict;
}

export interface MqttTrigger extends BaseTrigger {
  platform: "mqtt";
  topic: string;
  payload?: string;
}

export interface GeoLocationTrigger extends BaseTrigger {
  platform: "geo_location";
  source: string;
  zone: string;
  event: "enter" | "leave";
}

export interface HassTrigger extends BaseTrigger {
  platform: "homeassistant";
  event: "start" | "shutdown";
}

export interface NumericStateTrigger extends BaseTrigger {
  platform: "numeric_state";
  entity_id: string | string[];
  attribute?: string;
  above?: number;
  below?: number;
  value_template?: string;
  for?: string | number | ForDict;
}

export interface ConversationTrigger extends BaseTrigger {
  platform: "conversation";
  command: string | string[];
}

export interface SunTrigger extends BaseTrigger {
  platform: "sun";
  offset: number;
  event: "sunrise" | "sunset";
}

export interface TimePatternTrigger extends BaseTrigger {
  platform: "time_pattern";
  hours?: number | string;
  minutes?: number | string;
  seconds?: number | string;
}

export interface WebhookTrigger extends BaseTrigger {
  platform: "webhook";
  webhook_id: string;
  allowed_methods?: string[];
  local_only?: boolean;
}

export interface PersistentNotificationTrigger extends BaseTrigger {
  platform: "persistent_notification";
  notification_id?: string;
  update_type?: string[];
}

export interface ZoneTrigger extends BaseTrigger {
  platform: "zone";
  entity_id: string;
  zone: string;
  event: "enter" | "leave";
}

export interface TagTrigger extends BaseTrigger {
  platform: "tag";
  tag_id: string;
  device_id?: string;
}

export interface TimeTrigger extends BaseTrigger {
  platform: "time";
  at: string;
}

export interface TemplateTrigger extends BaseTrigger {
  platform: "template";
  value_template: string;
  for?: string | number | ForDict;
}

export interface EventTrigger extends BaseTrigger {
  platform: "event";
  event_type: string;
  event_data?: any;
  context?: ContextConstraint;
}

export interface CalendarTrigger extends BaseTrigger {
  platform: "calendar";
  event: "start" | "end";
  entity_id: string;
  offset: string;
}

export type Trigger =
  | StateTrigger
  | MqttTrigger
  | GeoLocationTrigger
  | HassTrigger
  | NumericStateTrigger
  | SunTrigger
  | ConversationTrigger
  | TimePatternTrigger
  | WebhookTrigger
  | PersistentNotificationTrigger
  | ZoneTrigger
  | TagTrigger
  | TimeTrigger
  | TemplateTrigger
  | EventTrigger
  | DeviceTrigger
  | CalendarTrigger;

interface BaseCondition {
  condition: string;
  alias?: string;
  enabled?: boolean;
}

export interface LogicalCondition extends BaseCondition {
  condition: "and" | "not" | "or";
  conditions: Condition | Condition[];
}

export interface StateCondition extends BaseCondition {
  condition: "state";
  entity_id: string;
  attribute?: string;
  state: string | number | string[];
  for?: string | number | ForDict;
  match?: "all" | "any";
}

export interface NumericStateCondition extends BaseCondition {
  condition: "numeric_state";
  entity_id: string;
  attribute?: string;
  above?: number;
  below?: number;
  value_template?: string;
}

export interface SunCondition extends BaseCondition {
  condition: "sun";
  after_offset?: number;
  before_offset?: number;
  after?: "sunrise" | "sunset";
  before?: "sunrise" | "sunset";
}

export interface ZoneCondition extends BaseCondition {
  condition: "zone";
  entity_id: string;
  zone: string;
}

type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface TimeCondition extends BaseCondition {
  condition: "time";
  after?: string;
  before?: string;
  weekday?: Weekday | Weekday[];
}

export interface TemplateCondition extends BaseCondition {
  condition: "template";
  value_template: string;
}

export interface TriggerCondition extends BaseCondition {
  condition: "trigger";
  id: string;
}

type ShorthandBaseCondition = Omit<BaseCondition, "condition">;

export interface ShorthandAndConditionList extends ShorthandBaseCondition {
  condition: Condition[];
}

export interface ShorthandAndCondition extends ShorthandBaseCondition {
  and: Condition[];
}

export interface ShorthandOrCondition extends ShorthandBaseCondition {
  or: Condition[];
}

export interface ShorthandNotCondition extends ShorthandBaseCondition {
  not: Condition[];
}

export type Condition =
  | StateCondition
  | NumericStateCondition
  | SunCondition
  | ZoneCondition
  | TimeCondition
  | TemplateCondition
  | DeviceCondition
  | LogicalCondition
  | TriggerCondition;

export type ConditionWithShorthand =
  | Condition
  | ShorthandAndConditionList
  | ShorthandAndCondition
  | ShorthandOrCondition
  | ShorthandNotCondition;

export const expandConditionWithShorthand = (
  cond: ConditionWithShorthand
): Condition => {
  if ("condition" in cond && Array.isArray(cond.condition)) {
    return {
      condition: "and",
      conditions: cond.condition,
    };
  }

  for (const condition of ["and", "or", "not"]) {
    if (condition in cond) {
      return {
        condition,
        conditions: cond[condition],
      } as Condition;
    }
  }

  return cond as Condition;
};

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

let initialAutomationEditorData: Partial<AutomationConfig> | undefined;

export const fetchAutomationFileConfig = (hass: HomeAssistant, id: string) =>
  hass.callApi<AutomationConfig>("GET", `config/automation/config/${id}`);

export const getAutomationStateConfig = (
  hass: HomeAssistant,
  entity_id: string
) =>
  hass.callWS<{ config: AutomationConfig }>({
    type: "automation/config",
    entity_id,
  });

export const saveAutomationConfig = (
  hass: HomeAssistant,
  id: string,
  config: AutomationConfig
) => hass.callApi<void>("POST", `config/automation/config/${id}`, config);

export const showAutomationEditor = (data?: Partial<AutomationConfig>) => {
  initialAutomationEditorData = data;
  navigate("/config/automation/edit/new");
};

export const duplicateAutomation = (config: AutomationConfig) => {
  showAutomationEditor({
    ...config,
    id: undefined,
    alias: undefined,
  });
};

export const getAutomationEditorInitData = () => {
  const data = initialAutomationEditorData;
  initialAutomationEditorData = undefined;
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

export type AutomationClipboard = {
  trigger?: Trigger;
  condition?: Condition;
  action?: Action;
};
