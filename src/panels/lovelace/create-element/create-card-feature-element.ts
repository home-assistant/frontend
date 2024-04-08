import "../card-features/hui-alarm-modes-card-feature";
import "../card-features/hui-climate-fan-modes-card-feature";
import "../card-features/hui-climate-swing-modes-card-feature";
import "../card-features/hui-climate-hvac-modes-card-feature";
import "../card-features/hui-climate-preset-modes-card-feature";
import "../card-features/hui-cover-open-close-card-feature";
import "../card-features/hui-cover-position-card-feature";
import "../card-features/hui-cover-tilt-card-feature";
import "../card-features/hui-cover-tilt-position-card-feature";
import "../card-features/hui-fan-preset-modes-card-feature";
import "../card-features/hui-fan-speed-card-feature";
import "../card-features/hui-humidifier-modes-card-feature";
import "../card-features/hui-humidifier-toggle-card-feature";
import "../card-features/hui-lawn-mower-commands-card-feature";
import "../card-features/hui-light-brightness-card-feature";
import "../card-features/hui-light-color-temp-card-feature";
import "../card-features/hui-numeric-input-card-feature";
import "../card-features/hui-select-options-card-feature";
import "../card-features/hui-target-temperature-card-feature";
import "../card-features/hui-target-humidity-card-feature";
import "../card-features/hui-update-actions-card-feature";
import "../card-features/hui-vacuum-commands-card-feature";
import "../card-features/hui-water-heater-operation-modes-card-feature";

import { LovelaceCardFeatureConfig } from "../card-features/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";

const TYPES: Set<LovelaceCardFeatureConfig["type"]> = new Set([
  "alarm-modes",
  "climate-fan-modes",
  "climate-swing-modes",
  "climate-hvac-modes",
  "climate-preset-modes",
  "cover-open-close",
  "cover-position",
  "cover-tilt-position",
  "cover-tilt",
  "fan-preset-modes",
  "fan-speed",
  "humidifier-modes",
  "humidifier-toggle",
  "lawn-mower-commands",
  "light-brightness",
  "light-color-temp",
  "numeric-input",
  "select-options",
  "target-humidity",
  "target-temperature",
  "update-actions",
  "vacuum-commands",
  "water-heater-operation-modes",
]);

export const createCardFeatureElement = (config: LovelaceCardFeatureConfig) =>
  createLovelaceElement("card-feature", config, TYPES);

export const getCardFeatureElementClass = (type: string) =>
  getLovelaceElementClass(type, "card-feature", TYPES);
