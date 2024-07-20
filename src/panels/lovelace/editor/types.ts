import { ActionConfig } from "../../../data/lovelace/config/action";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import {
  LovelaceViewConfig,
  ShowViewConfig,
} from "../../../data/lovelace/config/view";
import { EntityConfig, LovelaceRowConfig } from "../entity-rows/types";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";
import { LovelaceCardFeatureConfig } from "../card-features/types";
import { LovelaceElementConfig } from "../elements/types";
import { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";

export interface YamlChangedEvent extends Event {
  detail: {
    yaml: string;
  };
}

export interface GUIModeChangedEvent {
  guiMode: boolean;
  guiModeAvailable: boolean;
}

export interface ViewEditEvent extends Event {
  detail: {
    config: LovelaceViewConfig;
  };
}

export interface ViewVisibilityChangeEvent {
  visible: ShowViewConfig[];
}

export interface ConfigValue {
  format: "json" | "yaml";
  value?: string | LovelaceCardConfig;
}

export interface ConfigError {
  type: string;
  message: string;
}

export interface EntitiesEditorEvent extends CustomEvent {
  detail: {
    entities?: EntityConfig[];
    item?: any;
  };
  target: EventTarget | null;
}

export interface EditorTarget extends EventTarget {
  value?: string;
  index?: number;
  checked?: boolean;
  configValue?: string;
  type?: HTMLInputElement["type"];
  config: ActionConfig;
}

export interface Card {
  type: string;
  name?: string;
  description?: string;
  showElement?: boolean;
  isCustom?: boolean;
  isSuggested?: boolean;
}

export interface Badge {
  type: string;
  name?: string;
  description?: string;
  showElement?: boolean;
  isCustom?: boolean;
  isSuggested?: boolean;
}

export interface HeaderFooter {
  type: LovelaceHeaderFooterConfig["type"];
  icon?: string;
}

export interface CardPickTarget extends EventTarget {
  config: LovelaceCardConfig;
}

export interface BadgePickTarget extends EventTarget {
  config: LovelaceBadgeConfig;
}

export interface SubElementEditorConfig {
  index?: number;
  elementConfig?:
    | LovelaceRowConfig
    | LovelaceHeaderFooterConfig
    | LovelaceCardFeatureConfig
    | LovelaceElementConfig;
  type: "header" | "footer" | "row" | "feature" | "element";
}

export interface EditSubElementEvent {
  subElementConfig: SubElementEditorConfig;
}
