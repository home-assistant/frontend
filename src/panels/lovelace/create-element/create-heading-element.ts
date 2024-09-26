import "../heading-items/hui-entity-heading-item";

import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";
import { LovelaceHeadingItemConfig } from "../heading-items/types";

const ALWAYS_LOADED_TYPES = new Set(["error", "entity"]);

export const createHeadingItemElement = (config: LovelaceHeadingItemConfig) =>
  createLovelaceElement(
    "heading-item",
    config,
    ALWAYS_LOADED_TYPES,
    undefined,
    undefined,
    "entity"
  );

export const getHeadingItemElementClass = (type: string) =>
  getLovelaceElementClass(type, "heading-item", ALWAYS_LOADED_TYPES);
