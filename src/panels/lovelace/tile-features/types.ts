import { AlarmMode } from "../../../data/alarm_control_panel";
import { HvacMode } from "../../../data/climate";

export interface CoverOpenCloseTileFeatureConfig {
  type: "cover-open-close";
}

export interface CoverTiltTileFeatureConfig {
  type: "cover-tilt";
}

export interface LightBrightnessTileFeatureConfig {
  type: "light-brightness";
}

export interface FanSpeedTileFeatureConfig {
  type: "fan-speed";
}

export interface AlarmModesTileFeatureConfig {
  type: "alarm-modes";
  modes?: AlarmMode[];
}

export interface ClimateHvacModesTileFeatureConfig {
  type: "climate-hvac-modes";
  hvac_modes?: HvacMode[];
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
  | VacuumCommandsTileFeatureConfig
  | FanSpeedTileFeatureConfig
  | AlarmModesTileFeatureConfig
  | ClimateHvacModesTileFeatureConfig;

export type LovelaceTileFeatureContext = {
  entity_id?: string;
};
