export interface LovelaceTileControlConfig {
  type: "cover-position";
}

export interface CoverPositionTileControlConfig
  extends LovelaceTileControlConfig {
  type: "cover-position";
  mode: "slider" | "button";
}
