import {
  LovelaceCardConfig,
  LovelaceViewConfig,
  ActionConfig,
} from "../../../data/lovelace";
import { EntityConfig } from "../entity-rows/types";
import { InputType } from "zlib";
import { struct } from "../common/structs/struct";

export interface YamlChangedEvent extends Event {
  detail: {
    yaml: string;
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
  config: ActionConfig;
}

export interface CardPickTarget extends EventTarget {
  type: string;
}

export const actionConfigStruct = struct({
  action: "string",
  navigation_path: "string?",
  url_path: "string?",
  service: "string?",
  service_data: "object?",
  confirmation: "object?",
});

export const entitiesConfigStruct = struct.union([
  {
    entity: "entity-id?",
    name: "string?",
    icon: "icon?",
    secondary_info: "string?",
    action_name: "string?",
    service: "string?",
    service_data: "object?",
    url: "string?",
    tap_action: "object?",
    hold_action: "object?",
    double_tap_action: "object?",
    state_color: "boolean?",
  },
  "entity-id",
]);
