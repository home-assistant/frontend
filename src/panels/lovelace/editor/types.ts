import {
  any,
  array,
  boolean,
  dynamic,
  enums,
  literal,
  number,
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

export const actionConfigStruct = dynamic((_value, ctx) => {
  if (ctx.branch[0][ctx.path[0]]) {
    return (
      actionConfigMap[ctx.branch[0][ctx.path[0]].action] ||
      actionConfigStructType
    );
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
  view: union([string(), number()]),
  dashboard: optional(string()),
  name: optional(string()),
  icon: optional(string()),
  hide_if_unavailable: optional(boolean()),
});

const callServiceEntitiesRowConfigStruct = object({
  type: string(),
  name: string(),
  service: string(),
  icon: optional(string()),
  action_name: optional(string()),
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
      string(),
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
