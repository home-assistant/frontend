import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { CoverEntityFeature } from "../../../data/cover";
import { LovelaceTileExtraConfig } from "./types";

type TileExtraType = LovelaceTileExtraConfig["type"];
export type SupportsTileExtra = (stateObj: HassEntity) => boolean;

const TILE_EXTRAS_SUPPORT: Record<TileExtraType, SupportsTileExtra> = {
  "cover-open-close": (stateObj) =>
    computeDomain(stateObj.entity_id) === "cover" &&
    (supportsFeature(stateObj, CoverEntityFeature.OPEN) ||
      supportsFeature(stateObj, CoverEntityFeature.CLOSE)),
  "cover-tilt": (stateObj) =>
    computeDomain(stateObj.entity_id) === "cover" &&
    (supportsFeature(stateObj, CoverEntityFeature.OPEN_TILT) ||
      supportsFeature(stateObj, CoverEntityFeature.CLOSE_TILT)),
};

const TILE_EXTRAS_EDITABLE: Set<TileExtraType> = new Set([]);

export const supportsTileExtra = (
  stateObj: HassEntity,
  extra: TileExtraType
): boolean => {
  const supportFunction = TILE_EXTRAS_SUPPORT[extra] as
    | SupportsTileExtra
    | undefined;
  return !supportFunction || supportFunction(stateObj);
};

export const isTileExtraEditable = (extra: TileExtraType): boolean =>
  TILE_EXTRAS_EDITABLE.has(extra);

export const MAX_DISPLAYED_EXTRAS = 1;
