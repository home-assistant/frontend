import { AlarmMode } from "../../../data/alarm_control_panel";
import { HvacMode } from "../../../data/climate";
import { OperationMode } from "../../../data/water_heater";

export interface CoverOpenCloseCardFeatureConfig {
  type: "cover-open-close";
}

export interface CoverPositionCardFeatureConfig {
  type: "cover-position";
}

export interface CoverTiltCardFeatureConfig {
  type: "cover-tilt";
}

export interface CoverTiltPositionCardFeatureConfig {
  type: "cover-tilt-position";
}

export interface LightBrightnessCardFeatureConfig {
  type: "light-brightness";
}

export interface LightColorTempCardFeatureConfig {
  type: "light-color-temp";
}

export interface FanSpeedCardFeatureConfig {
  type: "fan-speed";
}

export interface AlarmModesCardFeatureConfig {
  type: "alarm-modes";
  modes?: AlarmMode[];
}

export interface ClimateHvacModesCardFeatureConfig {
  type: "climate-hvac-modes";
  hvac_modes?: HvacMode[];
}

export interface ClimatePresetModesCardFeatureConfig {
  type: "climate-preset-modes";
  style?: "dropdown" | "icons";
  preset_modes?: string[];
}

export interface SelectOptionsCardFeatureConfig {
  type: "select-options";
}

export interface NumericInputCardFeatureConfig {
  type: "numeric-input";
  style?: "buttons" | "slider";
}

export interface TargetTemperatureCardFeatureConfig {
  type: "target-temperature";
}

export interface WaterHeaterOperationModesCardFeatureConfig {
  type: "water-heater-operation-modes";
  operation_modes?: OperationMode[];
}

export interface HumidifierModesCardFeatureConfig {
  type: "humidifier-modes";
}

export const VACUUM_COMMANDS = [
  "start_pause",
  "stop",
  "clean_spot",
  "locate",
  "return_home",
] as const;

export type VacuumCommand = (typeof VACUUM_COMMANDS)[number];

export interface VacuumCommandsCardFeatureConfig {
  type: "vacuum-commands";
  commands?: VacuumCommand[];
}

export const LAWN_MOWER_COMMANDS = ["start_pause", "dock"] as const;

export type LawnMowerCommand = (typeof LAWN_MOWER_COMMANDS)[number];

export interface LawnMowerCommandsCardFeatureConfig {
  type: "lawn-mower-commands";
  commands?: LawnMowerCommand[];
}

export type LovelaceCardFeatureConfig =
  | AlarmModesCardFeatureConfig
  | ClimateHvacModesCardFeatureConfig
  | ClimatePresetModesCardFeatureConfig
  | CoverOpenCloseCardFeatureConfig
  | CoverPositionCardFeatureConfig
  | CoverTiltPositionCardFeatureConfig
  | CoverTiltCardFeatureConfig
  | FanSpeedCardFeatureConfig
  | HumidifierModesCardFeatureConfig
  | LawnMowerCommandsCardFeatureConfig
  | LightBrightnessCardFeatureConfig
  | LightColorTempCardFeatureConfig
  | VacuumCommandsCardFeatureConfig
  | TargetTemperatureCardFeatureConfig
  | WaterHeaterOperationModesCardFeatureConfig
  | SelectOptionsCardFeatureConfig
  | NumericInputCardFeatureConfig;

export type LovelaceCardFeatureContext = {
  entity_id?: string;
};
