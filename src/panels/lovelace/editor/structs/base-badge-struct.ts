import { object, string, any, optional, boolean } from "superstruct";

export const baseLovelaceBadgeConfig = object({
  type: string(),
  visibility: any(),
  disabled: optional(boolean()),
});
