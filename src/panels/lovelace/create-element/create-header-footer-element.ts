import { LovelaceHeaderFooterConfig } from "../header-footer/types";
import { createLovelaceElement } from "./create-element-base";

// lazy load imports
import "../header-footer/hui-picture-header-footer";
import "../header-footer/hui-buttons-header-footer";

const ALWAYS_LOADED_TYPES = new Set([
  // lazy load types
  "picture",
  "buttons",
]);
const LAZY_LOAD_TYPES = {
  // picture: () => import("../header-footer/hui-picture-header-footer"),
  // buttons: () => import("../header-footer/hui-buttons-header-footer"),
};

export const createHeaderFooterElement = (config: LovelaceHeaderFooterConfig) =>
  createLovelaceElement(
    "header-footer",
    config,
    ALWAYS_LOADED_TYPES, // replace with undefined when empty
    LAZY_LOAD_TYPES,
    undefined,
    undefined
  );
