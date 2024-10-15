import { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { MASONRY_VIEW_LAYOUT, PANEL_VIEW_LAYOUT } from "./const";

export const getViewType = (config?: LovelaceViewConfig): string => {
  if (!config || !config.type) return MASONRY_VIEW_LAYOUT;
  if (config.panel) return PANEL_VIEW_LAYOUT;
  return config.type;
};
