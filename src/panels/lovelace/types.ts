import { HomeAssistant } from "../../types";

export interface LovelaceConfig {
  type: string;
  id: string;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  getCardSize(): number;
  setConfig(config: LovelaceConfig): void;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceConfig): void;
}
