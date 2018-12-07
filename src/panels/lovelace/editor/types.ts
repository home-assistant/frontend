import { LovelaceCardConfig, LovelaceViewConfig } from "../../../data/lovelace";
import { EntityConfig } from "../entity-rows/types";
import { InputType } from "zlib";

export interface YamlChangedEvent extends Event {
  detail: {
    yaml: string;
  };
}

export interface CardPickedEvent extends Event {
  detail: {
    config: LovelaceCardConfig;
  };
}

export interface ViewEditEvent extends Event {
  detail: {
    config: LovelaceViewConfig;
  };
}

export interface ConfigValue {
  format: "json" | "yaml";
  value?: string | LovelaceCardConfig;
}

export interface ConfigError {
  type: string;
  message: string;
}

export interface EntitiesEditorEvent {
  detail?: {
    entities?: EntityConfig[];
  };
  target?: EventTarget;
}

export interface EditorTarget extends EventTarget {
  value?: string;
  index?: number;
  checked?: boolean;
  configValue?: string;
  type?: InputType;
}

export interface CardPickTarget extends EventTarget {
  type: string;
}
