export interface CoverOpenCloseTileExtraConfig {
  type: "cover-open-close";
}

export interface CoverTiltTileExtraConfig {
  type: "cover-tilt";
}

export interface LightBrightnessTileExtraConfig {
  type: "light-brightness";
}

export type LovelaceTileExtraConfig =
  | CoverOpenCloseTileExtraConfig
  | CoverTiltTileExtraConfig
  | LightBrightnessTileExtraConfig;
