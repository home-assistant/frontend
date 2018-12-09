import { HomeAssistant } from "../../types";
import { LovelaceCardConfig, LovelaceConfig } from "../../data/lovelace";

export interface Lovelace {
  hass: HomeAssistant;
  config: LovelaceConfig;
  editMode: boolean;
  autoGen: boolean;
  legacy: boolean;
  save: (newConfig: LovelaceConfig) => Promise<void>;
  addCard: (path: [number], cardConfig: LovelaceCardConfig) => Promise<void>;
  deleteCard: (path: [number, number]) => Promise<void>;
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
