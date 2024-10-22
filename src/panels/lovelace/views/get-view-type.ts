import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import {
  MASONRY_VIEW_LAYOUT,
  PANEL_VIEW_LAYOUT,
  SECTIONS_VIEW_LAYOUT,
} from "./const";

export const getViewType = (config?: LovelaceViewConfig): string => {
  if (config?.type) {
    return config.type;
  }
  if (config?.panel) {
    return PANEL_VIEW_LAYOUT;
  }
  if (config?.sections) {
    return SECTIONS_VIEW_LAYOUT;
  }
  if (config?.cards) {
    return MASONRY_VIEW_LAYOUT;
  }
  return SECTIONS_VIEW_LAYOUT;
};
