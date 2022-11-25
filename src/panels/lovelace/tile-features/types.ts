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

export type VacuumCommand = typeof VACUUM_COMMANDS[number];

export interface VacuumCommandsTileFeatureConfig {
  type: "vacuum-commands";
  commands?: VacuumCommand[];
}

export const ALARM_COMMANDS = [
  "alarm_arm_away",
  "alarm_arm_home",
  "alarm_arm_night",
  "alarm_arm_vacation",
  "alarm_arm_custom_bypass",
  "alarm_disarm",
] as const;

export type AlarmCommand = typeof ALARM_COMMANDS[number];

export interface AlarmCommandsTileFeatureConfig {
  type: "alarm-commands";
  commands?: AlarmCommand[];
}

export type LovelaceTileFeatureConfig =
  | AlarmCommandsTileFeatureConfig
  | CoverOpenCloseTileFeatureConfig
  | CoverTiltTileFeatureConfig
  | LightBrightnessTileFeatureConfig
  | VacuumCommandsTileFeatureConfig;

export type LovelaceTileFeatureContext = {
  entity_id?: string;
};
