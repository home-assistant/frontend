import { LovelaceViewElement } from "../../../data/lovelace";

import "./masonry-view";

const LAYOUT_PREFIX = "ll-view-";
const CUSTOM_PREFIX = "custom:";

const ALWAYS_LOADED_LAYOUTS = new Set(["masonry"]);

const LAZY_LOAD_LAYOUTS = {
  panel: () => import("./panel-view"),
};

export const getLovelaceViewElement = (name: string): LovelaceViewElement => {
  let tag = LAYOUT_PREFIX;

  if (name in LAZY_LOAD_LAYOUTS) {
    LAZY_LOAD_LAYOUTS[name]();
    tag += name;
  }

  if (ALWAYS_LOADED_LAYOUTS.has(name)) {
    tag += name;
  }

  if (name.startsWith(CUSTOM_PREFIX)) {
    tag += name.substr(CUSTOM_PREFIX.length);
  }

  return document.createElement(tag) as LovelaceViewElement;
};
