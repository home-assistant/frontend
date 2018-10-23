import { HomeAssistant } from "../../../types";

export interface EntityConfig {
  entity: string;
  name: string;
  icon: string;
}

export interface EntityRow {
  hass: HomeAssistant;
  config: EntityConfig;
}
