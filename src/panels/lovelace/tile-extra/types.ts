export interface CoverOpenCloseTileExtraConfig {
  type: "cover-open-close";
}

export interface CoverTiltTileExtraConfig {
  type: "cover-tilt";
}

export interface LightBrightnessTileExtraConfig {
  type: "light-brightness";
}

export const VACUUM_COMMANDS = [
  "start_pause",
  "stop",
  "clean_spot",
  "locate",
  "return_home",
] as const;

export type VacuumCommand = typeof VACUUM_COMMANDS[number];

export interface VacuumCommandsTileExtraConfig {
  type: "vacuum-commands";
  commands?: VacuumCommand[];
}

export type LovelaceTileExtraConfig =
  | CoverOpenCloseTileExtraConfig
  | CoverTiltTileExtraConfig
  | LightBrightnessTileExtraConfig
  | VacuumCommandsTileExtraConfig;

export type LovelaceTileExtraContext = {
  entity_id?: string;
};
