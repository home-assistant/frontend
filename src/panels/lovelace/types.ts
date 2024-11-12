import type { HassEntity } from "home-assistant-js-websocket";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { HaFormSchema } from "../../components/ha-form/types";
import type { LovelaceBadgeConfig } from "../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../data/lovelace/config/card";
import type {
  LovelaceConfig,
  LovelaceRawConfig,
} from "../../data/lovelace/config/types";
import type { FrontendLocaleData } from "../../data/translation";
import type { Constructor, HomeAssistant } from "../../types";
import type { LovelaceRow, LovelaceRowConfig } from "./entity-rows/types";
import type { LovelaceHeaderFooterConfig } from "./header-footer/types";
import type { LovelaceCardFeatureConfig } from "./card-features/types";
import type { LovelaceElement, LovelaceElementConfig } from "./elements/types";
import type { LovelaceHeadingBadgeConfig } from "./heading-badges/types";
import type { ShowToastParams } from "../../managers/notification-manager";

declare global {
  // eslint-disable-next-line
  interface HASSDomEvents {
    "ll-rebuild": Record<string, unknown>;
    "ll-upgrade": Record<string, unknown>;
    "ll-badge-rebuild": Record<string, unknown>;
  }
}

export interface Lovelace {
  config: LovelaceConfig;
  rawConfig: LovelaceRawConfig;
  editMode: boolean;
  urlPath: string | null;
  mode: "generated" | "yaml" | "storage";
  locale: FrontendLocaleData;
  enableFullEditMode: () => void;
  setEditMode: (editMode: boolean) => void;
  saveConfig: (newConfig: LovelaceRawConfig) => Promise<void>;
  deleteConfig: () => Promise<void>;
  showToast: (params: ShowToastParams) => void;
}

export interface LovelaceBadge extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceBadgeConfig): void;
}

export type LovelaceLayoutOptions = {
  grid_columns?: number | "full";
  grid_rows?: number | "auto";
  grid_max_columns?: number;
  grid_min_columns?: number;
  grid_min_rows?: number;
  grid_max_rows?: number;
};

export type LovelaceGridOptions = {
  columns?: number | "full";
  rows?: number | "auto";
  max_columns?: number;
  min_columns?: number;
  min_rows?: number;
  max_rows?: number;
};

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  preview?: boolean;
  layout?: string;
  getCardSize(): number | Promise<number>;
  /** @deprecated Use `getGridOptions` instead */
  getLayoutOptions?(): LovelaceLayoutOptions;
  getGridOptions?(): LovelaceGridOptions;
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceConfigForm {
  schema: HaFormSchema[];
  assertConfig?: (config: LovelaceCardConfig) => void;
  computeLabel?: (
    schema: HaFormSchema,
    localize: LocalizeFunc
  ) => string | undefined;
  computeHelper?: (
    schema: HaFormSchema,
    localize: LocalizeFunc
  ) => string | undefined;
}

export interface LovelaceCardConstructor extends Constructor<LovelaceCard> {
  getStubConfig?: (
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ) => LovelaceCardConfig;
  getConfigElement?: () => LovelaceCardEditor;
  getConfigForm?: () => LovelaceConfigForm;
}

export interface LovelaceBadgeConstructor extends Constructor<LovelaceBadge> {
  getStubConfig?: (
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ) => LovelaceBadgeConfig;
  getConfigElement?: () => LovelaceBadgeEditor;
  getConfigForm?: () => LovelaceConfigForm;
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

export interface LovelaceElementConstructor
  extends Constructor<LovelaceElement> {
  getConfigElement?: () => LovelacePictureElementEditor;
  getStubConfig?: (
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ) => LovelaceElementConfig;
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

export interface LovelaceBadgeEditor extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceBadgeConfig): void;
}

export interface LovelaceHeaderFooterEditor
  extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceHeaderFooterConfig): void;
}

export interface LovelaceRowEditor extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceRowConfig): void;
}

export interface LovelacePictureElementEditor
  extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceElementConfig): void;
}

export interface LovelaceGenericElementEditor<C = any> extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: LovelaceConfig;
  context?: C;
  setConfig(config: any): void;
  focusYamlEditor?: () => void;
}

export interface LovelaceCardFeature extends HTMLElement {
  hass?: HomeAssistant;
  stateObj?: HassEntity;
  setConfig(config: LovelaceCardFeatureConfig);
  color?: string;
}

export interface LovelaceCardFeatureConstructor
  extends Constructor<LovelaceCardFeature> {
  getStubConfig?: (
    hass: HomeAssistant,
    stateObj?: HassEntity
  ) => LovelaceCardFeatureConfig;
  getConfigElement?: () => LovelaceCardFeatureEditor;
  getConfigForm?: () => {
    schema: HaFormSchema[];
    assertConfig?: (config: LovelaceCardConfig) => void;
  };
  isSupported?: (stateObj?: HassEntity) => boolean;
}

export interface LovelaceCardFeatureEditor
  extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceCardFeatureConfig): void;
}

export interface LovelaceHeadingBadge extends HTMLElement {
  hass?: HomeAssistant;
  preview?: boolean;
  setConfig(config: LovelaceHeadingBadgeConfig);
}

export interface LovelaceHeadingBadgeConstructor
  extends Constructor<LovelaceHeadingBadge> {
  getStubConfig?: (
    hass: HomeAssistant,
    stateObj?: HassEntity
  ) => LovelaceHeadingBadgeConfig;
  getConfigElement?: () => LovelaceHeadingBadgeEditor;
  getConfigForm?: () => {
    schema: HaFormSchema[];
    assertConfig?: (config: LovelaceCardConfig) => void;
  };
}

export interface LovelaceHeadingBadgeEditor
  extends LovelaceGenericElementEditor {
  setConfig(config: LovelaceHeadingBadgeConfig): void;
}
