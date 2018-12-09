import { HomeAssistant } from "../../types";
import { LovelaceCardConfig, LovelaceConfig } from "../../data/lovelace";

export interface Lovelace {
  config: LovelaceConfig;
  editMode: boolean;
  autoGen: boolean;
  legacy: boolean;
  setEditMode: (editMode: boolean) => void;
  saveConfig: (newConfig: LovelaceConfig) => Promise<void>;
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
