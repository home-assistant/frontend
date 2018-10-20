import { HomeAssistant } from "../../types";

export interface LovelaceConfig {
  type: string;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  getCardSize(): number;
  setConfig(config: LovelaceConfig): void;
}

export interface EntityConfig {
  entity: string;
  name: string;
  icon: string;
}

export interface EntityRow {
  hass: HomeAssistant;
  config: EntityConfig;
}
