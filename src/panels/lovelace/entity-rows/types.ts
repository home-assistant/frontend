import { HomeAssistant } from "../../../types";

export interface EntityConfig {
  entity: string;
  name: string;
  icon: string;
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
export interface CallServiceConfig {
  name: string;
  icon: string;
  action_name: string;
  service: string;
  service_data: string;
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
