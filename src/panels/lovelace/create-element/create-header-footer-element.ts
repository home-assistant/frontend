import { LovelaceHeaderFooterConfig } from "../header-footer/types";
import { createLovelaceElement } from "./create-element-base";

const LAZY_LOAD_TYPES = {
  picture: () => import("../header-footer/hui-picture-header-footer"),
  buttons: () => import("../header-footer/hui-buttons-header-footer"),
  graph: () => import("../header-footer/hui-graph-header-footer"),
};

export const createHeaderFooterElement = (config: LovelaceHeaderFooterConfig) =>
  createLovelaceElement(
    "header-footer",
    config,
    undefined,
    LAZY_LOAD_TYPES,
    undefined,
    undefined
  );
