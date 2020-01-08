import { HomeAssistant } from "../../types";
import {
  LovelaceCardConfig,
  LovelaceConfig,
  LovelaceBadgeConfig,
} from "../../data/lovelace";

declare global {
  // tslint:disable-next-line
  interface HASSDomEvents {
    "ll-rebuild": {};
    "ll-badge-rebuild": {};
  }
}

export interface Lovelace {
  config: LovelaceConfig;
  editMode: boolean;
  mode: "generated" | "yaml" | "storage";
  language: string;
  enableFullEditMode: () => void;
  setEditMode: (editMode: boolean) => void;
  saveConfig: (newConfig: LovelaceConfig) => Promise<void>;
  deleteConfig: () => Promise<void>;
}

export interface LovelaceBadge extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceBadgeConfig): void;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  isPanel?: boolean;
  getCardSize(): number;
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceCardConfig): void;
}
