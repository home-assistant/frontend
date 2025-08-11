import "../card-features/hui-alarm-modes-card-feature";
import "../card-features/hui-button-card-feature";
import "../card-features/hui-climate-fan-modes-card-feature";
import "../card-features/hui-climate-hvac-modes-card-feature";
import "../card-features/hui-climate-preset-modes-card-feature";
import "../card-features/hui-climate-swing-horizontal-modes-card-feature";
import "../card-features/hui-climate-swing-modes-card-feature";
import "../card-features/hui-counter-actions-card-feature";
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
import "../card-features/hui-lock-commands-card-feature";
import "../card-features/hui-lock-open-door-card-feature";
import "../card-features/hui-media-player-volume-slider-card-feature";
import "../card-features/hui-numeric-input-card-feature";
import "../card-features/hui-select-options-card-feature";
import "../card-features/hui-target-humidity-card-feature";
import "../card-features/hui-target-temperature-card-feature";
import "../card-features/hui-toggle-card-feature";
import "../card-features/hui-update-actions-card-feature";
import "../card-features/hui-vacuum-commands-card-feature";
import "../card-features/hui-valve-open-close-card-feature";
import "../card-features/hui-water-heater-operation-modes-card-feature";
import "../card-features/hui-area-controls-card-feature";

import type { LovelaceCardFeatureConfig } from "../card-features/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";

const TYPES = new Set<LovelaceCardFeatureConfig["type"]>([
  "alarm-modes",
  "button",
  "area-controls",
  "climate-fan-modes",
  "climate-swing-modes",
  "climate-swing-horizontal-modes",
  "climate-hvac-modes",
  "climate-preset-modes",
  "counter-actions",
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
  "lock-commands",
  "lock-open-door",
  "media-player-volume-slider",
  "numeric-input",
  "select-options",
  "target-humidity",
  "target-temperature",
  "toggle",
  "update-actions",
  "vacuum-commands",
  "valve-open-close",
  "water-heater-operation-modes",
]);

export const createCardFeatureElement = (config: LovelaceCardFeatureConfig) =>
  createLovelaceElement("card-feature", config, TYPES);

export const getCardFeatureElementClass = (type: string) =>
  getLovelaceElementClass(type, "card-feature", TYPES);
