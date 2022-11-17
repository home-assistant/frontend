export interface CoverOpenCloseTileExtraConfig {
  type: "cover-open-close";
}

export interface CoverTiltTileExtraConfig {
  type: "cover-tilt";
}

export type LovelaceTileExtraConfig =
  | CoverOpenCloseTileExtraConfig
  | CoverTiltTileExtraConfig;
