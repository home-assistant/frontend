import { object, optional, number } from "superstruct";

export const forDictStruct = object({
  days: optional(number()),
  hours: optional(number()),
  minutes: optional(number()),
  seconds: optional(number()),
});
