import { LovelaceTileControlConfig } from "../tile-control/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";
import "../tile-control/hui-cover-open-close-tile-control";
import "../tile-control/hui-cover-tilt-tile-control";

const TYPES: Set<LovelaceTileControlConfig["type"]> = new Set([
  "cover-open-close",
  "cover-tilt",
]);

export const createTileControlElement = (config: LovelaceTileControlConfig) =>
  createLovelaceElement("tile-control", config, TYPES);

export const getTileControlElementClass = (type: string) =>
  getLovelaceElementClass(type, "tile-control", TYPES);
