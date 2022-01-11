import { object, optional, number, string } from "superstruct";

export const baseTriggerStruct = object({
  platform: string(),
  id: optional(string()),
});

export const forDictStruct = object({
  days: optional(number()),
  hours: optional(number()),
  minutes: optional(number()),
  seconds: optional(number()),
});
