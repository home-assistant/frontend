import { HomeAssistant } from "../../../types";
import { Condition } from "../common/validate-condition";

export interface EntityConfig {
  entity: string;
  type?: string;
  name?: string;
  icon?: string;
  image?: string;
}
export interface EntityFilterEntityConfig extends EntityConfig {
  state_filter?: Array<{ key: string } | string>;
}
export interface DividerConfig {
  type: "divider";
  style: string;
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
}
export interface CallServiceConfig extends EntityConfig {
  type: "call-service";
  action_name?: string;
  service: string;
  service_data?: { [key: string]: any };
}
export interface CastConfig {
  type: "cast";
  icon: string;
  name: string;
  view: string | number;
  // Hide the row if either unsupported browser or no API available.
  hide_if_unavailable: boolean;
}
export type LovelaceRowConfig =
  | EntityConfig
  | DividerConfig
  | SectionConfig
  | WeblinkConfig
  | CallServiceConfig
  | CastConfig;

export interface LovelaceRow extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceRowConfig);
}

export interface ConditionalRowConfig extends EntityConfig {
  row: EntityConfig;
  conditions: Condition[];
}
