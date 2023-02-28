import { HassEntity } from "home-assistant-js-websocket";
import {
  LovelaceBadgeConfig,
  LovelaceCardConfig,
  LovelaceConfig,
} from "../../data/lovelace";
import { FrontendLocaleData } from "../../data/translation";
import { Constructor, HomeAssistant } from "../../types";
import { LovelaceRow, LovelaceRowConfig } from "./entity-rows/types";
import { LovelaceHeaderFooterConfig } from "./header-footer/types";
import { LovelaceTileFeatureConfig } from "./tile-features/types";

declare global {
  // eslint-disable-next-line
  interface HASSDomEvents {
    "ll-rebuild": Record<string, unknown>;
    "ll-badge-rebuild": Record<string, unknown>;
  }
}

export interface Lovelace {
  config: LovelaceConfig;
  // If not set, a strategy was used to generate everything
  rawConfig: LovelaceConfig | undefined;
  editMode: boolean;
  urlPath: string | null;
  mode: "generated" | "yaml" | "storage";
  locale: FrontendLocaleData;
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

export interface LovelaceHeaderFooterConstructor
  extends Constructor<LovelaceHeaderFooter> {
  getStubConfig?: (
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ) => LovelaceHeaderFooterConfig;
  getConfigElement?: () => LovelaceHeaderFooterEditor;
}

export interface LovelaceRowConstructor extends Constructor<LovelaceRow> {
  getConfigElement?: () => LovelaceRowEditor;
}

export interface LovelaceHeaderFooter extends HTMLElement {
  hass?: HomeAssistant;
  type: "header" | "footer";
  getCardSize(): number | Promise<number>;
  setConfig(config: LovelaceHeaderFooterConfig): void;
}

export interface LovelaceCardEditor extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceHeaderFooterEditor
  extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceHeaderFooterConfig): void;
}

export interface LovelaceRowEditor extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceRowConfig): void;
}

export interface LovelaceGenericElementEditor<C = any> extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: LovelaceConfig;
  context?: C;
  setConfig(config: any): void;
  focusYamlEditor?: () => void;
}

export interface LovelaceTileFeature extends HTMLElement {
  hass?: HomeAssistant;
  stateObj?: HassEntity;
  setConfig(config: LovelaceTileFeatureConfig);
}

export interface LovelaceTileFeatureConstructor
  extends Constructor<LovelaceTileFeature> {
  getConfigElement?: () => LovelaceTileFeatureEditor;
  getStubConfig?: (
    hass: HomeAssistant,
    stateObj?: HassEntity
  ) => LovelaceTileFeatureConfig;
  isSupported?: (stateObj?: HassEntity) => boolean;
}

export interface LovelaceTileFeatureEditor
  extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceTileFeatureConfig): void;
}
