import {
  any,
  array,
  boolean,
  object,
  optional,
  string,
  union,
} from "superstruct";
import {
  ActionConfig,
  LovelaceCardConfig,
  LovelaceViewConfig,
  ShowViewConfig,
} from "../../../data/lovelace";
import { EntityId } from "../common/structs/is-entity-id";
import { Icon } from "../common/structs/is-icon";
import { EntityConfig } from "../entity-rows/types";

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

const buttonEntitiesRowConfigStruct = object({
  type: string(),
  name: string(),
  action_name: optional(string()),
  tap_action: actionConfigStruct,
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const castEntitiesRowConfigStruct = object({
  type: string(),
  view: string(),
  dashboard: optional(string()),
  name: optional(string()),
  icon: optional(string()),
  hide_if_unavailable: optional(string()),
});

const callServiceEntitiesRowConfigStruct = object({
  type: string(),
  name: string(),
  icon: optional(string()),
  action_name: optional(string()),
  service: string(),
  service_data: optional(any()),
});

const conditionalEntitiesRowConfigStruct = object({
  type: string(),
  row: any(),
  conditions: array(
    object({
      entity: string(),
      state: optional(string()),
      state_not: optional(string()),
    })
  ),
});

const dividerEntitiesRowConfigStruct = object({
  type: string(),
  style: optional(any()),
});

const sectionEntitiesRowConfigStruct = object({
  type: string(),
  label: optional(string()),
});

const webLinkEntitiesRowConfigStruct = object({
  type: string(),
  url: string(),
  name: optional(string()),
  icon: optional(string()),
});

const buttonsEntitiesRowConfigStruct = object({
  type: string(),
  entities: array(
    union([
      object({
        entity: string(),
        icon: optional(string()),
        image: optional(string()),
        name: optional(string()),
      }),
      EntityId,
    ])
  ),
});

const attributeEntitiesRowConfigStruct = object({
  type: string(),
  entity: string(),
  attribute: string(),
  prefix: optional(string()),
  suffix: optional(string()),
  name: optional(string()),
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
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
  }),
  EntityId,
  buttonEntitiesRowConfigStruct,
  castEntitiesRowConfigStruct,
  conditionalEntitiesRowConfigStruct,
  dividerEntitiesRowConfigStruct,
  sectionEntitiesRowConfigStruct,
  webLinkEntitiesRowConfigStruct,
  buttonsEntitiesRowConfigStruct,
  attributeEntitiesRowConfigStruct,
  callServiceEntitiesRowConfigStruct,
]);
