import {
  ActionConfig,
  LovelaceCardConfig,
  LovelaceViewConfig,
  ShowViewConfig,
} from "../../../data/lovelace";
import { EntityConfig, LovelaceRowConfig } from "../entity-rows/types";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";
import { LovelaceTileControlConfig } from "../tile-control/types";

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
}

export interface HeaderFooter {
  type: LovelaceHeaderFooterConfig["type"];
  icon?: string;
}

export interface CardPickTarget extends EventTarget {
  config: LovelaceCardConfig;
}

export interface SubElementEditorConfig {
  index?: number;
  elementConfig?:
    | LovelaceRowConfig
    | LovelaceHeaderFooterConfig
    | LovelaceTileControlConfig;
  type: "header" | "footer" | "row" | "tile-control";
}

export interface EditSubElementEvent {
  subElementConfig: SubElementEditorConfig;
}
