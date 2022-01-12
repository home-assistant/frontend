import { object, string, any } from "superstruct";

export const baseLovelaceCardConfig = object({
  type: string(),
  view_layout: any(),
});
