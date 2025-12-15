import "../heading-badges/hui-entity-heading-badge";

import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";
import type { LovelaceHeadingBadgeConfig } from "../heading-badges/types";

const ALWAYS_LOADED_TYPES = new Set(["error", "entity"]);

export const createHeadingBadgeElement = (config: LovelaceHeadingBadgeConfig) =>
  createLovelaceElement(
    "heading-badge",
    config,
    ALWAYS_LOADED_TYPES,
    undefined,
    undefined,
    "entity"
  );

export const getHeadingBadgeElementClass = (type: string) =>
  getLovelaceElementClass(type, "heading-badge", ALWAYS_LOADED_TYPES);
