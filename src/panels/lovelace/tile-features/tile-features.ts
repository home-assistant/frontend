import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { CoverEntityFeature } from "../../../data/cover";
import {
  LightColorMode,
  lightSupportsBrightness,
  lightSupportsColorMode,
} from "../../../data/light";
import { supportsVacuumCommand } from "./hui-vacuum-commands-tile-feature";
import { LovelaceTileFeatureConfig, VACUUM_COMMANDS } from "./types";

type TileFeatureType = LovelaceTileFeatureConfig["type"];
export type SupportsTileFeature = (stateObj: HassEntity) => boolean;

const TILE_FEATURES_SUPPORT: Record<TileFeatureType, SupportsTileFeature> = {
  "cover-open-close": (stateObj) =>
    computeDomain(stateObj.entity_id) === "cover" &&
    (supportsFeature(stateObj, CoverEntityFeature.OPEN) ||
      supportsFeature(stateObj, CoverEntityFeature.CLOSE)),
  "cover-tilt": (stateObj) =>
    computeDomain(stateObj.entity_id) === "cover" &&
    (supportsFeature(stateObj, CoverEntityFeature.OPEN_TILT) ||
      supportsFeature(stateObj, CoverEntityFeature.CLOSE_TILT)),
  "light-brightness": (stateObj) =>
    computeDomain(stateObj.entity_id) === "light" &&
    lightSupportsBrightness(stateObj),
  "light-temperature": (stateObj) =>
    computeDomain(stateObj.entity_id) === "light" &&
    lightSupportsColorMode(stateObj, LightColorMode.COLOR_TEMP),
  "vacuum-commands": (stateObj) =>
    computeDomain(stateObj.entity_id) === "vacuum" &&
    VACUUM_COMMANDS.some((c) => supportsVacuumCommand(stateObj, c)),
};

const TILE_FEATURE_EDITABLE: Set<TileFeatureType> = new Set([
  "vacuum-commands",
]);

export const supportsTileFeature = (
  stateObj: HassEntity,
  feature: TileFeatureType
): boolean => {
  const supportFunction = TILE_FEATURES_SUPPORT[feature] as
    | SupportsTileFeature
    | undefined;
  return !supportFunction || supportFunction(stateObj);
};

export const isTileFeatureEditable = (feature: TileFeatureType): boolean =>
  TILE_FEATURE_EDITABLE.has(feature);
