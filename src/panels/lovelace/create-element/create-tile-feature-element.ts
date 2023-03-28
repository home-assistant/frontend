import { LovelaceTileFeatureConfig } from "../tile-features/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";
import "../tile-features/hui-cover-open-close-tile-feature";
import "../tile-features/hui-cover-tilt-tile-feature";
import "../tile-features/hui-light-brightness-tile-feature";
import "../tile-features/hui-vacuum-commands-tile-feature";
import "../tile-features/hui-fan-speed-tile-feature";

const TYPES: Set<LovelaceTileFeatureConfig["type"]> = new Set([
  "cover-open-close",
  "cover-tilt",
  "light-brightness",
  "vacuum-commands",
  "fan-speed",
]);

export const createTileFeatureElement = (config: LovelaceTileFeatureConfig) =>
  createLovelaceElement("tile-feature", config, TYPES);

export const getTileFeatureElementClass = (type: string) =>
  getLovelaceElementClass(type, "tile-feature", TYPES);
