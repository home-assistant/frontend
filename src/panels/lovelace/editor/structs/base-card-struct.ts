import { object, string, any, optional, boolean } from "superstruct";

export const baseLovelaceCardConfig = object({
  type: string(),
  view_layout: any(),
  layout_options: any(),
  grid_options: any(),
  visibility: any(),
  disabled: optional(boolean()),
});
