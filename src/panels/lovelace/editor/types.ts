import {
  array,
  boolean,
  dynamic,
  enums,
  literal,
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
import { EntityConfig, LovelaceRowConfig } from "../entity-rows/types";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";

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
    item?: any;
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

export interface HeaderFooter {
  type: string;
  icon?: string;
}

export interface CardPickTarget extends EventTarget {
  config: LovelaceCardConfig;
}

export interface SubElementEditorConfig {
  index?: number;
  elementConfig?: LovelaceRowConfig | LovelaceHeaderFooterConfig;
  type: string;
}

export interface EditSubElementEvent {
  subElementConfig: SubElementEditorConfig;
}

export const actionConfigStruct = dynamic((value: any) => {
  if (value && value.action in actionConfigMap) {
    return actionConfigMap[value.action];
  }
  return actionConfigStructType;
});

const actionConfigStructUser = object({
  user: string(),
});

const actionConfigStructConfirmation = union([
  boolean(),
  object({
    text: optional(string()),
    excemptions: optional(array(actionConfigStructUser)),
  }),
]);

const actionConfigStructUrl = object({
  action: literal("url"),
  url_path: string(),
  confirmation: optional(actionConfigStructConfirmation),
});

const actionConfigStructService = object({
  action: literal("call-service"),
  service: string(),
  service_data: optional(object()),
  target: optional(
    object({
      entity_id: optional(union([string(), array(string())])),
      device_id: optional(union([string(), array(string())])),
      area_id: optional(union([string(), array(string())])),
    })
  ),
  confirmation: optional(actionConfigStructConfirmation),
});

const actionConfigStructNavigate = object({
  action: literal("navigate"),
  navigation_path: string(),
  confirmation: optional(actionConfigStructConfirmation),
});

const actionConfigMap = {
  url: actionConfigStructUrl,
  navigate: actionConfigStructNavigate,
  "call-service": actionConfigStructService,
};

export const actionConfigStructType = object({
  action: enums([
    "none",
    "toggle",
    "more-info",
    "call-service",
    "url",
    "navigate",
  ]),
  confirmation: optional(actionConfigStructConfirmation),
});

export const entitiesConfigStruct = union([
  object({
    entity: string(),
    name: optional(string()),
    icon: optional(string()),
    image: optional(string()),
    secondary_info: optional(string()),
    format: optional(string()),
    state_color: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    hold_action: optional(actionConfigStruct),
    double_tap_action: optional(actionConfigStruct),
  }),
  string(),
]);
