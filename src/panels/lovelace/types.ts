import { HomeAssistant } from "../../types";

export interface LovelaceConfig {
  type: string;
}

export interface LovelaceCard {
  getCardSize(): number;
  setConfig(config: LovelaceConfig): void;
}

export interface LovelaceCardElement extends HTMLElement {
  hass: HomeAssistant;
}
