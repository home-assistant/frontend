import { LovelaceConfig } from "../types";
import { EntityConfig } from "../entity-rows/types";

export interface YamlChangedEvent extends Event {
  detail: {
    yaml: string;
  };
}

export interface ConfigValue {
  format: "js" | "yaml";
  value: string | LovelaceConfig;
}

export interface EditorEvent {
  detail?: {
    entities?: EntityConfig[];
  };
  target?: EventTarget;
}
