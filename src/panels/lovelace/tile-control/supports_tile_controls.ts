import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import { LovelaceTileControlConfig } from "./types";

type TileControlType = LovelaceTileControlConfig["type"];
type SupportsControl = (stateObj: HassEntity) => boolean;

const TILE_CONTROLS: Record<TileControlType, SupportsControl> = {
  "cover-position": (stateObj) => computeDomain(stateObj.entity_id) === "cover",
};

export const supportsTileControl = (
  stateObj: HassEntity,
  control: TileControlType
): boolean => {
  const supportFunction = TILE_CONTROLS[control] as SupportsControl | undefined;
  return !supportFunction || supportFunction(stateObj);
};
