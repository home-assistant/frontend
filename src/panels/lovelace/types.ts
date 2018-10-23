import { HomeAssistant } from "../../types.js";

export interface LovelaceConfig {
  type: string;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  getCardSize(): number;
  setConfig(config: LovelaceConfig): void;
}
