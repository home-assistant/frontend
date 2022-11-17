export interface CoverOpenCloseTileControlConfig {
  type: "cover-open-close";
}

export interface CoverTiltTileControlConfig {
  type: "cover-tilt";
}

export type LovelaceTileControlConfig =
  | CoverOpenCloseTileControlConfig
  | CoverTiltTileControlConfig;
