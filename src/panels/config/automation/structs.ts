import {
  array,
  boolean,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";

export const baseTriggerStruct = object({
  trigger: string(),
  id: optional(string()),
  enabled: optional(boolean()),
  note: optional(string()),
});

export const optionStruct = object({
  alias: optional(string()),
  note: optional(string()),
  conditions: union([string(), object(), array(union([string(), object()]))]),
  sequence: union([object(), array(object())]),
});

export const forDictStruct = object({
  days: optional(number()),
  hours: optional(number()),
  minutes: optional(number()),
  seconds: optional(number()),
});
