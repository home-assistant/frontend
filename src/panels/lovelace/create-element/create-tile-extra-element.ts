import { LovelaceTileExtraConfig } from "../tile-extra/types";
import {
  createLovelaceElement,
  getLovelaceElementClass,
} from "./create-element-base";
import "../tile-extra/hui-cover-open-close-tile-extra";
import "../tile-extra/hui-cover-tilt-tile-extra";
import "../tile-extra/hui-light-brightness-tile-extra";
import "../tile-extra/hui-vacuum-commands-tile-extra";
import "../tile-extra/hui-fan-speed-tile-extra";

const TYPES: Set<LovelaceTileExtraConfig["type"]> = new Set([
  "cover-open-close",
  "cover-tilt",
  "light-brightness",
  "vacuum-commands",
  "fan-speed",
]);

export const createTileExtraElement = (config: LovelaceTileExtraConfig) =>
  createLovelaceElement("tile-extra", config, TYPES);

export const getTileExtraElementClass = (type: string) =>
  getLovelaceElementClass(type, "tile-extra", TYPES);
