import {
  LovelaceBadgeConfig,
  LovelaceCardConfig,
  LovelaceConfig,
} from "../../data/lovelace";
import { Constructor, HomeAssistant } from "../../types";
import { LovelaceHeaderFooterConfig } from "./header-footer/types";

declare global {
  // eslint-disable-next-line
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
  editMode?: boolean;
  getCardSize(): number | Promise<number>;
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceCardConstructor extends Constructor<LovelaceCard> {
  getStubConfig?: (
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ) => LovelaceCardConfig;
  getConfigElement?: () => LovelaceCardEditor;
}

export interface LovelaceHeaderFooter extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceHeaderFooterConfig): void;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: LovelaceConfig;
  setConfig(config: LovelaceCardConfig): void;
}
