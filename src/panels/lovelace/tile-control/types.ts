export interface CoverOpenCloseTileControlConfig {
  type: "cover-open-close";
}

export interface CoverPositionTileControlConfig {
  type: "cover-position";
}

export interface LightBrightnessTileControlConfig {
  type: "light-brightness";
}

export type LovelaceTileControlConfig =
  | CoverOpenCloseTileControlConfig
  | CoverPositionTileControlConfig
  | LightBrightnessTileControlConfig;
