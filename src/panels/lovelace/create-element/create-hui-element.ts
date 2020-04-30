import "../elements/hui-conditional-element";
import "../elements/hui-icon-element";
import "../elements/hui-image-element";
import "../elements/hui-service-button-element";
import "../elements/hui-state-badge-element";
import "../elements/hui-state-icon-element";
import "../elements/hui-state-label-element";
import { LovelaceElementConfig } from "../elements/types";
import { createLovelaceElement } from "./create-element-base";

const ALWAYS_LOADED_TYPES = new Set([
  "conditional",
  "icon",
  "image",
  "service-button",
  "state-badge",
  "state-icon",
  "state-label",
]);

export const createHuiElement = (config: LovelaceElementConfig) =>
  createLovelaceElement("element", config, ALWAYS_LOADED_TYPES);
