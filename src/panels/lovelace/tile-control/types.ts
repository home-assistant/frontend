export interface CoverPositionButtonsTileControlConfig {
  type: "cover-position-buttons";
}

export interface CoverPositionSliderTileControlConfig {
  type: "cover-position-slider";
}

export type LovelaceTileControlConfig =
  | CoverPositionButtonsTileControlConfig
  | CoverPositionSliderTileControlConfig;
