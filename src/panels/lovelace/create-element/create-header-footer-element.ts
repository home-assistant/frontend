import "../header-footer/hui-picture-header-footer";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";
import { createLovelaceElement } from "./create-element-base";

const SPECIAL_TYPES = new Set(["picture"]);

export const createHeaderFooterElement = (config: LovelaceHeaderFooterConfig) =>
  createLovelaceElement("header-footer", config, SPECIAL_TYPES);
