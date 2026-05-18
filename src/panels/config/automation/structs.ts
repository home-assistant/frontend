import { object, optional, number, string, boolean } from "superstruct";

export const baseTriggerStruct = object({
  trigger: string(),
  id: optional(string()),
  enabled: optional(boolean()),
  comment: optional(string()),
});

export const forDictStruct = object({
  days: optional(number()),
  hours: optional(number()),
  minutes: optional(number()),
  seconds: optional(number()),
});
