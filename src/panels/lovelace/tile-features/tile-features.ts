import { HassEntity } from "home-assistant-js-websocket";
import { getTileFeatureElementClass } from "../create-element/create-tile-feature-element";
import { LovelaceTileFeatureConfig } from "./types";

type TileFeatureType = LovelaceTileFeatureConfig["type"];

export const supportsTileFeature = async (
  stateObj: HassEntity,
  feature: TileFeatureType
): Promise<boolean> => {
  try {
    const elementClass = await getTileFeatureElementClass(feature);
    return !elementClass.isSupported || elementClass.isSupported(stateObj);
  } catch (err) {
    return false;
  }
};

const EDITABLE_TILE_FEATURE = new Set<TileFeatureType>(["vacuum-commands"]);

export const isTileFeatureEditable = (feature: TileFeatureType): boolean =>
  EDITABLE_TILE_FEATURE.has(feature);
