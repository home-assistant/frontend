export interface CoverOpenCloseTileFeatureConfig {
  type: "cover-open-close";
}

export interface CoverTiltTileFeatureConfig {
  type: "cover-tilt";
}

export interface LightBrightnessTileFeatureConfig {
  type: "light-brightness";
}

export const VACUUM_COMMANDS = [
  "start_pause",
  "stop",
  "clean_spot",
  "locate",
  "return_home",
] as const;

export type VacuumCommand = (typeof VACUUM_COMMANDS)[number];

export interface VacuumCommandsTileFeatureConfig {
  type: "vacuum-commands";
  commands?: VacuumCommand[];
}

export type LovelaceTileFeatureConfig =
  | CoverOpenCloseTileFeatureConfig
  | CoverTiltTileFeatureConfig
  | LightBrightnessTileFeatureConfig
  | VacuumCommandsTileFeatureConfig;

export type LovelaceTileFeatureContext = {
  entity_id?: string;
};
