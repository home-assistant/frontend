import "../header-footer/hui-picture-header-footer";
import "../header-footer/hui-buttons-header-footer";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";
import { createLovelaceElement } from "./create-element-base";

const SPECIAL_TYPES = new Set(["picture", "buttons"]);

export const createHeaderFooterElement = (config: LovelaceHeaderFooterConfig) =>
  createLovelaceElement("header-footer", config, SPECIAL_TYPES);
