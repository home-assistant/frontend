import "../tile-features/hui-alarm-modes-tile-feature";
import "../tile-features/hui-climate-hvac-modes-tile-feature";
import "../tile-features/hui-cover-open-close-tile-feature";
import "../tile-features/hui-cover-tilt-tile-feature";
import "../tile-features/hui-fan-speed-tile-feature";
import "../tile-features/hui-light-brightness-tile-feature";
import "../tile-features/hui-vacuum-commands-tile-feature";
import "../tile-features/hui-water-heater-operation-modes-tile-feature";
import { LovelaceTileFeatureConfig } from "../tile-features/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";

const TYPES: Set<LovelaceTileFeatureConfig["type"]> = new Set([
  "cover-open-close",
  "cover-tilt",
  "light-brightness",
  "vacuum-commands",
  "fan-speed",
  "alarm-modes",
  "climate-hvac-modes",
  "water-heater-operation-modes",
]);

export const createTileFeatureElement = (config: LovelaceTileFeatureConfig) =>
  createLovelaceElement("tile-feature", config, TYPES);

export const getTileFeatureElementClass = (type: string) =>
  getLovelaceElementClass(type, "tile-feature", TYPES);
