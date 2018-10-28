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
  name: string;
  icon: string;
  url: string;
}
export type EntityRowConfig =
  | EntityConfig
  | DividerConfig
  | SectionConfig
  | WeblinkConfig;

export interface EntityRow {
  hass?: HomeAssistant;
  setConfig(config: EntityRowConfig);
}
