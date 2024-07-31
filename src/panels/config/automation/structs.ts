import { object, optional, number, string, boolean } from "superstruct";

export const baseTriggerStruct = object({
  platform: string(),
  id: optional(string()),
  enabled: optional(boolean()),
});

export const forDictStruct = object({
  days: optional(number()),
  hours: optional(number()),
  minutes: optional(number()),
  seconds: optional(number()),
});
