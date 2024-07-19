import { object, string, any } from "superstruct";

export const baseLovelaceBadgeConfig = object({
  type: string(),
  visibility: any(),
});
