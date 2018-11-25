import { HomeAssistant } from "../../types";

export interface LovelaceCardConfig {
  id?: string;
  type: string;
  [key: string]: any;
}

export interface LovelaceViewConfig {
  title?: string;
  badges?: string[];
  cards?: LovelaceCardConfig[];
  id?: string;
  icon?: string;
}

export interface LovelaceConfig {
  _frontendAuto: boolean;
  title?: string;
  views: LovelaceViewConfig[];
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  getCardSize(): number;
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceCardConfig): void;
}
