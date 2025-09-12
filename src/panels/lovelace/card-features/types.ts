import type { AlarmMode } from "../../../data/alarm_control_panel";
import type { HvacMode } from "../../../data/climate";
import type { OperationMode } from "../../../data/water_heater";

export interface ButtonCardFeatureConfig {
  type: "button";
  action_name?: string;
}

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

export interface LockCommandsCardFeatureConfig {
  type: "lock-commands";
}

export interface LockOpenDoorCardFeatureConfig {
  type: "lock-open-door";
}

export interface MediaPlayerPlaybackCardFeatureConfig {
  type: "media-player-playback";
}

export interface MediaPlayerVolumeSliderCardFeatureConfig {
  type: "media-player-volume-slider";
}

export interface FanDirectionCardFeatureConfig {
  type: "fan-direction";
}

export interface FanOscillateCardFeatureConfig {
  type: "fan-oscillate";
}

export interface FanPresetModesCardFeatureConfig {
  type: "fan-preset-modes";
  style?: "dropdown" | "icons";
  preset_modes?: string[];
}

export interface FanSpeedCardFeatureConfig {
  type: "fan-speed";
}

export interface AlarmModesCardFeatureConfig {
  type: "alarm-modes";
  modes?: AlarmMode[];
}

export interface ClimateFanModesCardFeatureConfig {
  type: "climate-fan-modes";
  style?: "dropdown" | "icons";
  fan_modes?: string[];
}

export interface ClimateSwingModesCardFeatureConfig {
  type: "climate-swing-modes";
  style?: "dropdown" | "icons";
  swing_modes?: string[];
}

export interface ClimateSwingHorizontalModesCardFeatureConfig {
  type: "climate-swing-horizontal-modes";
  style?: "dropdown" | "icons";
  swing_horizontal_modes?: string[];
}

export interface ClimateHvacModesCardFeatureConfig {
  type: "climate-hvac-modes";
  style?: "dropdown" | "icons";
  hvac_modes?: HvacMode[];
}

export interface ClimatePresetModesCardFeatureConfig {
  type: "climate-preset-modes";
  style?: "dropdown" | "icons";
  preset_modes?: string[];
}

export const COUNTER_ACTIONS = ["decrement", "reset", "increment"] as const;

export type CounterActions = (typeof COUNTER_ACTIONS)[number];

export interface CounterActionsCardFeatureConfig {
  type: "counter-actions";
  actions?: CounterActions[];
}

export interface DateSetCardFeatureConfig {
  type: "date-set";
}

export interface SelectOptionsCardFeatureConfig {
  type: "select-options";
  options?: string[];
}

export interface NumericInputCardFeatureConfig {
  type: "numeric-input";
  style?: "buttons" | "slider";
}

export interface TargetHumidityCardFeatureConfig {
  type: "target-humidity";
}

export interface TargetTemperatureCardFeatureConfig {
  type: "target-temperature";
}

export interface ToggleCardFeatureConfig {
  type: "toggle";
}

export interface WaterHeaterOperationModesCardFeatureConfig {
  type: "water-heater-operation-modes";
  operation_modes?: OperationMode[];
}

export interface HumidifierModesCardFeatureConfig {
  type: "humidifier-modes";
  style?: "dropdown" | "icons";
  modes?: string[];
}

export interface HumidifierToggleCardFeatureConfig {
  type: "humidifier-toggle";
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

export interface ValveOpenCloseCardFeatureConfig {
  type: "valve-open-close";
}

export interface ValvePositionCardFeatureConfig {
  type: "valve-position";
}

export const LAWN_MOWER_COMMANDS = ["start_pause", "dock"] as const;

export type LawnMowerCommand = (typeof LAWN_MOWER_COMMANDS)[number];

export interface LawnMowerCommandsCardFeatureConfig {
  type: "lawn-mower-commands";
  commands?: LawnMowerCommand[];
}

export interface UpdateActionsCardFeatureConfig {
  type: "update-actions";
  backup?: "yes" | "no" | "ask";
}

export interface TrendGraphCardFeatureConfig {
  type: "trend-graph";
  hours_to_show?: number;
}

export const AREA_CONTROLS = [
  "light",
  "fan",
  "cover-shutter",
  "cover-blind",
  "cover-curtain",
  "cover-shade",
  "cover-awning",
  "cover-garage",
  "cover-gate",
  "cover-door",
  "cover-window",
  "cover-damper",
  "switch",
] as const;

export type AreaControl = (typeof AREA_CONTROLS)[number];

export interface AreaControlsCardFeatureConfig {
  type: "area-controls";
  controls?: AreaControl[];
}

export interface BarGaugeCardFeatureConfig {
  type: "bar-gauge";
}

export type LovelaceCardFeaturePosition = "bottom" | "inline";

export type LovelaceCardFeatureConfig =
  | AlarmModesCardFeatureConfig
  | ButtonCardFeatureConfig
  | ClimateFanModesCardFeatureConfig
  | ClimateSwingModesCardFeatureConfig
  | ClimateSwingHorizontalModesCardFeatureConfig
  | ClimateHvacModesCardFeatureConfig
  | ClimatePresetModesCardFeatureConfig
  | CounterActionsCardFeatureConfig
  | CoverOpenCloseCardFeatureConfig
  | CoverPositionCardFeatureConfig
  | CoverTiltPositionCardFeatureConfig
  | CoverTiltCardFeatureConfig
  | DateSetCardFeatureConfig
  | FanDirectionCardFeatureConfig
  | FanOscillateCardFeatureConfig
  | FanPresetModesCardFeatureConfig
  | FanSpeedCardFeatureConfig
  | TrendGraphCardFeatureConfig
  | HumidifierToggleCardFeatureConfig
  | HumidifierModesCardFeatureConfig
  | LawnMowerCommandsCardFeatureConfig
  | LightBrightnessCardFeatureConfig
  | LightColorTempCardFeatureConfig
  | LockCommandsCardFeatureConfig
  | LockOpenDoorCardFeatureConfig
  | MediaPlayerPlaybackCardFeatureConfig
  | MediaPlayerVolumeSliderCardFeatureConfig
  | NumericInputCardFeatureConfig
  | SelectOptionsCardFeatureConfig
  | TrendGraphCardFeatureConfig
  | TargetHumidityCardFeatureConfig
  | TargetTemperatureCardFeatureConfig
  | ToggleCardFeatureConfig
  | UpdateActionsCardFeatureConfig
  | VacuumCommandsCardFeatureConfig
  | ValveOpenCloseCardFeatureConfig
  | ValvePositionCardFeatureConfig
  | WaterHeaterOperationModesCardFeatureConfig
  | AreaControlsCardFeatureConfig
  | BarGaugeCardFeatureConfig;

export interface LovelaceCardFeatureContext {
  entity_id?: string;
  area_id?: string;
}
