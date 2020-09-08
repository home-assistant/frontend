import {
  ActionConfig,
  LovelaceCardConfig,
  LovelaceViewConfig,
  ShowViewConfig,
} from "../../../data/lovelace";
import { EntityConfig } from "../entity-rows/types";
import { optional, string, object, union, boolean } from "superstruct";
import { EntityId } from "../common/structs/is-entity-id";
import { Icon } from "../common/structs/is-icon";

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

export interface CardPickTarget extends EventTarget {
  config: LovelaceCardConfig;
}

export const actionConfigStruct = object({
  action: string(),
  navigation_path: optional(string()),
  url_path: optional(string()),
  service: optional(string()),
  service_data: optional(object()),
});

export const entitiesConfigStruct = union([
  object({
    entity: EntityId,
    name: optional(string()),
    icon: optional(Icon),
    image: optional(string()),
    secondary_info: optional(string()),
    format: optional(string()),
    state_color: optional(boolean()),
  }),
  EntityId,
]);
