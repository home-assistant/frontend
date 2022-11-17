import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { CoverEntityFeature } from "../../../data/cover";
import { LovelaceTileControlConfig } from "./types";

type TileControlType = LovelaceTileControlConfig["type"];
export type SupportsTileControl = (stateObj: HassEntity) => boolean;

const TILE_CONTROLS_SUPPORT: Record<TileControlType, SupportsTileControl> = {
  "cover-open-close": (stateObj) =>
    computeDomain(stateObj.entity_id) === "cover" &&
    (supportsFeature(stateObj, CoverEntityFeature.OPEN) ||
      supportsFeature(stateObj, CoverEntityFeature.CLOSE)),
  "cover-tilt": (stateObj) =>
    computeDomain(stateObj.entity_id) === "cover" &&
    (supportsFeature(stateObj, CoverEntityFeature.OPEN_TILT) ||
      supportsFeature(stateObj, CoverEntityFeature.CLOSE_TILT)),
};

const TILE_CONTROLS_EDITABLE: Set<TileControlType> = new Set([]);

export const supportsTileControl = (
  stateObj: HassEntity,
  control: TileControlType
): boolean => {
  const supportFunction = TILE_CONTROLS_SUPPORT[control] as
    | SupportsTileControl
    | undefined;
  return !supportFunction || supportFunction(stateObj);
};

export const isTileControlEditable = (control: TileControlType): boolean =>
  TILE_CONTROLS_EDITABLE.has(control);
