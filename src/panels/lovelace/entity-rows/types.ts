import { HomeAssistant } from "../../../types";

export interface EntityConfig {
  entity: string;
  type?: string;
  name?: string;
  icon?: string;
}
export interface DividerConfig {
  style: string;
}
export interface SectionConfig {
  label: string;
}
export interface WeblinkConfig {
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

export interface EntityRow {
  hass?: HomeAssistant;
  setConfig(config: EntityRowConfig);
}
