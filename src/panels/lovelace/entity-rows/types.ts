import type {
  ActionConfig,
  ConfirmationRestrictionConfig,
} from "../../../data/lovelace/config/action";
import type { HomeAssistant } from "../../../types";
import type { LegacyStateFilter } from "../common/evaluate-filter";
import type { Condition } from "../common/validate-condition";
import type { TimestampRenderingFormat } from "../components/types";

export interface EntityConfig {
  entity: string;
  type?: string;
  name?: string;
  icon?: string;
  image?: string;
}

export interface ConfirmableRowConfig extends EntityConfig {
  confirmation?: ConfirmationRestrictionConfig;
}

export interface ActionRowConfig extends ConfirmableRowConfig {
  action_name?: string;
}
export interface EntityFilterEntityConfig extends EntityConfig {
  state_filter?: LegacyStateFilter[];
  conditions?: Condition[];
}
export interface DividerConfig {
  type: "divider";
  style?: Record<string, string>;
}
export interface SectionConfig {
  type: "section";
  label: string;
}
export interface WeblinkConfig {
  type: "weblink";
  name?: string;
  icon?: string;
  url: string;
  new_tab?: boolean;
  download?: boolean;
}
export interface TextConfig {
  type: "text";
  name: string;
  icon?: string;
  text: string;
}
export interface CallServiceConfig extends EntityConfig {
  type: "call-service" | "perform-action";
  /** @deprecated use "action" instead */
  service?: string;
  action: string;
  data?: Record<string, any>;
  /** @deprecated use "data" instead */
  service_data?: Record<string, any>;
  action_name?: string;
}
export interface ButtonRowConfig extends EntityConfig {
  type: "button";
  action_name?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}
export interface CastConfig {
  type: "cast";
  icon?: string;
  name?: string;
  view?: string | number;
  dashboard?: string;
  // Hide the row if either unsupported browser or no API available.
  hide_if_unavailable?: boolean;
}
export interface ButtonsRowConfig {
  type: "buttons";
  entities: (string | EntityConfig)[];
}
export type LovelaceRowConfig =
  | EntityConfig
  | DividerConfig
  | SectionConfig
  | WeblinkConfig
  | CallServiceConfig
  | CastConfig
  | ButtonRowConfig
  | ButtonsRowConfig
  | ConditionalRowConfig
  | AttributeRowConfig
  | TextConfig
  | FilterRowConfig;

export interface LovelaceRow extends HTMLElement {
  hass?: HomeAssistant;
  preview?: boolean;
  setConfig(config: LovelaceRowConfig);
}

export interface ConditionalRowConfig extends EntityConfig {
  row: EntityConfig;
  conditions: Condition[];
}

export interface AttributeRowConfig extends EntityConfig {
  attribute: string;
  prefix?: string;
  suffix?: string;
  format?: TimestampRenderingFormat;
}

export interface FilterRowConfig {
  type: "Filter";
  filter: {
    label: string | string[];
  };
}
