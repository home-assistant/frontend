import { LovelaceTileControlConfig } from "../tile-control/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";
import "../tile-control/hui-cover-position-buttons-tile-control";
import "../tile-control/hui-cover-position-slider-tile-control";

const ALWAYS_LOADED_TYPES: Set<LovelaceTileControlConfig["type"]> = new Set([
  "cover-position-buttons",
  "cover-position-slider",
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
