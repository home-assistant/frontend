import {
  object,
  string,
  union,
  boolean,
  optional,
  array,
  literal,
  enums,
  type,
} from "superstruct";

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

const actionConfigStructCustom = type({
  action: literal("fire-dom-event"),
});

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

export const actionConfigStruct = union([
  actionConfigStructType,
  actionConfigStructUrl,
  actionConfigStructNavigate,
  actionConfigStructService,
  actionConfigStructCustom,
]);
