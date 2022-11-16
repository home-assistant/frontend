export interface CoverOpenCloseTileControlConfig {
  type: "cover-open-close";
}

export interface CoverTiltTileControlConfig {
  type: "cover-tilt";
}

export interface CoverPositionTileControlConfig {
  type: "cover-position";
}

export interface LightBrightnessTileControlConfig {
  type: "light-brightness";
}

export type LovelaceTileControlConfig =
  | CoverOpenCloseTileControlConfig
  | CoverTiltTileControlConfig
  | CoverPositionTileControlConfig
  | LightBrightnessTileControlConfig;
