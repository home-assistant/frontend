import { LovelaceTileControlConfig } from "../tile-control/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";
import "../tile-control/hui-cover-open-close-tile-control";
import "../tile-control/hui-cover-position-tile-control";
import "../tile-control/hui-light-brightness-tile-control";

const ALWAYS_LOADED_TYPES: Set<LovelaceTileControlConfig["type"]> = new Set([
  "cover-open-close",
  "cover-position",
  "light-brightness",
]);

const LAZY_LOAD_TYPES = {};

export const createTileControlElement = (config: LovelaceTileControlConfig) =>
  createLovelaceElement(
    "tile-control",
    config,
    ALWAYS_LOADED_TYPES,
    LAZY_LOAD_TYPES,
    undefined,
    undefined
  );

export const getTileControlElementClass = (type: string) =>
  getLovelaceElementClass(
    type,
    "tile-control",
    ALWAYS_LOADED_TYPES,
    LAZY_LOAD_TYPES
  );
