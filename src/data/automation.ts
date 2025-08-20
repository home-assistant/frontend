import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import { navigate } from "../common/navigate";
import { createSearchParam } from "../common/url/search-params";
import type { Context, HomeAssistant } from "../types";
import type { BlueprintInput } from "./blueprint";
import type { DeviceCondition, DeviceTrigger } from "./device_automation";
import type { Action, MODES } from "./script";
import { migrateAutomationAction } from "./script";
import { CONDITION_BUILDING_BLOCKS } from "./condition";

export const AUTOMATION_DEFAULT_MODE: (typeof MODES)[number] = "single";
export const AUTOMATION_DEFAULT_MAX = 10;

declare global {
  interface HASSDomEvents {
    /**
     * Dispatched to open the automation editor.
     * Used by custom cards/panels to trigger the editor view.
     */
    "show-automation-editor": ShowAutomationEditorParams;
  }
}

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
  triggers: Trigger | Trigger[];
  /** @deprecated Use `triggers` instead */
  trigger?: Trigger | Trigger[];
  conditions?: Condition | Condition[];
  /** @deprecated Use `conditions` instead */
  condition?: Condition | Condition[];
  actions: Action | Action[];
  /** @deprecated Use `actions` instead */
  action?: Action | Action[];
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

export interface TriggerList {
  triggers: Trigger | Trigger[] | undefined;
}

export interface BaseTrigger {
  alias?: string;
  /** @deprecated Use `trigger` instead */
  platform?: string;
  trigger: string;
  id?: string;
  variables?: Record<string, unknown>;
  enabled?: boolean;
}

export interface StateTrigger extends BaseTrigger {
  trigger: "state";
  entity_id: string | string[];
  attribute?: string;
  from?: string | string[];
  to?: string | string[];
  for?: string | number | ForDict;
}

export interface MqttTrigger extends BaseTrigger {
  trigger: "mqtt";
  topic: string;
  payload?: string;
}

export interface GeoLocationTrigger extends BaseTrigger {
  trigger: "geo_location";
  source: string;
  zone: string;
  event: "enter" | "leave";
}

export interface HassTrigger extends BaseTrigger {
  trigger: "homeassistant";
  event: "start" | "shutdown";
}

export interface NumericStateTrigger extends BaseTrigger {
  trigger: "numeric_state";
  entity_id: string | string[];
  attribute?: string;
  above?: number;
  below?: number;
  value_template?: string;
  for?: string | number | ForDict;
}

export interface ConversationTrigger extends BaseTrigger {
  trigger: "conversation";
  command: string | string[];
}

export interface SunTrigger extends BaseTrigger {
  trigger: "sun";
  offset: number;
  event: "sunrise" | "sunset";
}

export interface TimePatternTrigger extends BaseTrigger {
  trigger: "time_pattern";
  hours?: number | string;
  minutes?: number | string;
  seconds?: number | string;
}

export interface WebhookTrigger extends BaseTrigger {
  trigger: "webhook";
  webhook_id: string;
  allowed_methods?: string[];
  local_only?: boolean;
}

export interface PersistentNotificationTrigger extends BaseTrigger {
  trigger: "persistent_notification";
  notification_id?: string;
  update_type?: string[];
}

export interface ZoneTrigger extends BaseTrigger {
  trigger: "zone";
  entity_id: string;
  zone: string;
  event: "enter" | "leave";
}

export interface TagTrigger extends BaseTrigger {
  trigger: "tag";
  tag_id: string;
  device_id?: string;
}

export interface TimeTrigger extends BaseTrigger {
  trigger: "time";
  at: string | { entity_id: string; offset?: string };
  weekday?: string | string[];
}

export interface TemplateTrigger extends BaseTrigger {
  trigger: "template";
  value_template: string;
  for?: string | number | ForDict;
}

export interface EventTrigger extends BaseTrigger {
  trigger: "event";
  event_type: string;
  event_data?: any;
  context?: ContextConstraint;
}

export interface CalendarTrigger extends BaseTrigger {
  trigger: "calendar";
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
  | CalendarTrigger
  | TriggerList;

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
  above?: string | number;
  below?: string | number;
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

export type AutomationElementGroup = Record<
  string,
  { icon?: string; members?: AutomationElementGroup }
>;

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

  for (const condition of CONDITION_BUILDING_BLOCKS) {
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
) => hass.callApi<undefined>("POST", `config/automation/config/${id}`, config);

export const normalizeAutomationConfig = <
  T extends Partial<AutomationConfig> | AutomationConfig,
>(
  config: T
): T => {
  config = migrateAutomationConfig(config);

  // Normalize data: ensure triggers, actions and conditions are lists
  // Happens when people copy paste their automations into the config
  for (const key of ["triggers", "conditions", "actions"]) {
    const value = config[key];
    if (value && !Array.isArray(value)) {
      config[key] = [value];
    }
  }

  return config;
};

export const migrateAutomationConfig = <
  T extends Partial<AutomationConfig> | AutomationConfig,
>(
  config: T
) => {
  if ("trigger" in config) {
    if (!("triggers" in config)) {
      config.triggers = config.trigger;
    }
    delete config.trigger;
  }
  if ("condition" in config) {
    if (!("conditions" in config)) {
      config.conditions = config.condition;
    }
    delete config.condition;
  }
  if ("action" in config) {
    if (!("actions" in config)) {
      config.actions = config.action;
    }
    delete config.action;
  }

  if (config.triggers) {
    config.triggers = migrateAutomationTrigger(config.triggers);
  }

  if (config.actions) {
    config.actions = migrateAutomationAction(config.actions);
  }

  return config;
};

export const migrateAutomationTrigger = (
  trigger: Trigger | Trigger[]
): Trigger | Trigger[] => {
  if (!trigger) {
    return trigger;
  }

  if (Array.isArray(trigger)) {
    return trigger.map(migrateAutomationTrigger) as Trigger[];
  }

  if ("triggers" in trigger && trigger.triggers) {
    trigger.triggers = migrateAutomationTrigger(trigger.triggers);
  }

  if ("platform" in trigger) {
    if (!("trigger" in trigger)) {
      // @ts-ignore
      trigger.trigger = trigger.platform;
    }
    delete trigger.platform;
  }
  return trigger;
};

export const flattenTriggers = (
  triggers: undefined | Trigger | Trigger[]
): Trigger[] => {
  if (!triggers) {
    return [];
  }

  const flatTriggers: Trigger[] = [];

  ensureArray(triggers).forEach((t) => {
    if ("triggers" in t) {
      if (t.triggers) {
        flatTriggers.push(...flattenTriggers(t.triggers));
      }
    } else {
      flatTriggers.push(t);
    }
  });
  return flatTriggers;
};

export const showAutomationEditor = (
  data?: Partial<AutomationConfig>,
  expanded?: boolean
) => {
  initialAutomationEditorData = data;
  const params = expanded ? `?${createSearchParam({ expanded: "1" })}` : "";
  navigate(`/config/automation/edit/new${params}`);
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

export const isTrigger = (config: unknown): boolean => {
  if (!config || typeof config !== "object") {
    return false;
  }
  const trigger = config as Record<string, unknown>;
  return (
    ("trigger" in trigger && typeof trigger.trigger === "string") ||
    ("platform" in trigger && typeof trigger.platform === "string")
  );
};

export const isCondition = (config: unknown): boolean => {
  if (!config || typeof config !== "object") {
    return false;
  }
  const condition = config as Record<string, unknown>;
  return "condition" in condition && typeof condition.condition === "string";
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

export interface AutomationClipboard {
  trigger?: Trigger;
  condition?: Condition;
  action?: Action;
}

export interface ShowAutomationEditorParams {
  data?: Partial<AutomationConfig>;
  expanded?: boolean;
}
