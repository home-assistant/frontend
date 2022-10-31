import { LovelaceTileControlConfig } from "../tile-control/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";

const LAZY_LOAD_TYPES = {
  "cover-position": () =>
    import("../tile-control/hui-cover-position-tile-control"),
};

export const createTileControlElement = (config: LovelaceTileControlConfig) =>
  createLovelaceElement(
    "tile-control",
    config,
    undefined,
    LAZY_LOAD_TYPES,
    undefined,
    undefined
  );

export const getTileControlElementClass = (type: string) =>
  getLovelaceElementClass(type, "tile-control", undefined, LAZY_LOAD_TYPES);
