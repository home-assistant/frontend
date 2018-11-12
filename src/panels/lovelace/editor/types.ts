import { LovelaceConfig } from "../types";
import { EntityConfig } from "../entity-rows/types";

export interface YamlChangedEvent extends Event {
  detail: {
    yaml: string;
  };
}

export interface ConfigValue {
  format: "json" | "yaml";
  value: string | LovelaceConfig;
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
}
