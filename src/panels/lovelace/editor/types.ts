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
