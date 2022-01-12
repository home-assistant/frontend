import {
  LovelaceViewConfig,
  LovelaceViewElement,
} from "../../../data/lovelace";
import { HuiErrorCard } from "../cards/hui-error-card";
import "../views/hui-masonry-view";
import { createLovelaceElement } from "./create-element-base";

const ALWAYS_LOADED_LAYOUTS = new Set(["masonry"]);

const LAZY_LOAD_LAYOUTS = {
  panel: () => import("../views/hui-panel-view"),
  sidebar: () => import("../views/hui-sidebar-view"),
};

export const createViewElement = (
  config: LovelaceViewConfig
): LovelaceViewElement | HuiErrorCard =>
  createLovelaceElement(
    "view",
    config,
    ALWAYS_LOADED_LAYOUTS,
    LAZY_LOAD_LAYOUTS
  );
