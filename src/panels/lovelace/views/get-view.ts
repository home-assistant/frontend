import {
  LovelaceViewConfig,
  LovelaceViewElement,
} from "../../../data/lovelace";
import { createLovelaceElement } from "../create-element/create-element-base";
import "./hui-masonry-view";

const ALWAYS_LOADED_LAYOUTS = new Set(["masonry"]);

const LAZY_LOAD_LAYOUTS = {
  panel: () => import("./hui-panel-view"),
};

export const getLovelaceViewElement = (
  config: LovelaceViewConfig
): LovelaceViewElement => {
  return createLovelaceElement(
    "view",
    config,
    ALWAYS_LOADED_LAYOUTS,
    LAZY_LOAD_LAYOUTS
  );
};
