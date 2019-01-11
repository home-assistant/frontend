import { HomeAssistant } from "../../../types";

export interface EntityConfig {
  entity: string;
  type?: string;
  name?: string;
  icon?: string;
}
export interface DividerConfig {
  type: string;
  style: string;
}
export interface SectionConfig {
  type: string;
  label: string;
}
export interface WeblinkConfig {
  type: string;
  name?: string;
  icon?: string;
  url: string;
}
export interface CallServiceConfig extends EntityConfig {
  action_name?: string;
  service: string;
  service_data?: { [key: string]: any };
}
export type EntityRowConfig =
  | EntityConfig
  | DividerConfig
  | SectionConfig
  | WeblinkConfig
  | CallServiceConfig;

export interface EntityRow extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: EntityRowConfig);
}
