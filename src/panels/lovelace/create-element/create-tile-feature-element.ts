import "../tile-features/hui-alarm-modes-tile-feature";
import "../tile-features/hui-climate-hvac-modes-tile-feature";
import "../tile-features/hui-climate-preset-modes-tile-feature";
import "../tile-features/hui-cover-open-close-tile-feature";
import "../tile-features/hui-cover-position-tile-feature";
import "../tile-features/hui-cover-tilt-position-tile-feature";
import "../tile-features/hui-cover-tilt-tile-feature";
import "../tile-features/hui-fan-speed-tile-feature";
import "../tile-features/hui-lawn-mower-commands-tile-feature";
import "../tile-features/hui-light-brightness-tile-feature";
import "../tile-features/hui-light-color-temp-tile-feature";
import "../tile-features/hui-select-options-tile-feature";
import "../tile-features/hui-target-temperature-tile-feature";
import "../tile-features/hui-vacuum-commands-tile-feature";
import "../tile-features/hui-water-heater-operation-modes-tile-feature";
import { LovelaceTileFeatureConfig } from "../tile-features/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";

const TYPES: Set<LovelaceTileFeatureConfig["type"]> = new Set([
  "alarm-modes",
  "climate-hvac-modes",
  "climate-preset-modes",
  "cover-open-close",
  "cover-position",
  "cover-tilt-position",
  "cover-tilt",
  "fan-speed",
  "lawn-mower-commands",
  "light-brightness",
  "light-color-temp",
  "select-options",
  "target-temperature",
  "vacuum-commands",
  "water-heater-operation-modes",
]);

export const createTileFeatureElement = (config: LovelaceTileFeatureConfig) =>
  createLovelaceElement("tile-feature", config, TYPES);

export const getTileFeatureElementClass = (type: string) =>
  getLovelaceElementClass(type, "tile-feature", TYPES);
