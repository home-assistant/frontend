import type { AlarmMode } from "../../../data/alarm_control_panel";
import type { HvacMode } from "../../../data/climate";
import type { OperationMode } from "../../../data/water_heater";
import type { ForecastPrecipitationType } from "../../../data/weather";

export type { ForecastPrecipitationType };

export type ButtonCardData = Record<string, any>;

export interface ButtonCardFeatureConfig {
  type: "button";
  action_name?: string;
  data?: ButtonCardData;
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

export interface CoverPositionFavoriteCardFeatureConfig {
  type: "cover-position-favorite";
}

export interface CoverTiltFavoriteCardFeatureConfig {
  type: "cover-tilt-favorite";
}

export interface LightBrightnessCardFeatureConfig {
  type: "light-brightness";
}

export interface LightColorTempCardFeatureConfig {
  type: "light-color-temp";
}

export interface LightColorFavoritesCardFeatureConfig {
  type: "light-color-favorites";
}

export interface LockCommandsCardFeatureConfig {
  type: "lock-commands";
}

export interface LockOpenDoorCardFeatureConfig {
  type: "lock-open-door";
}

export const MEDIA_PLAYER_PLAYBACK_CONTROLS = [
  "turn_on",
  "turn_off",
  "media_play",
  "media_pause",
  "media_play_pause",
  "media_stop",
  "media_previous_track",
  "media_next_track",
] as const;

export type MediaPlayerPlaybackControl =
  (typeof MEDIA_PLAYER_PLAYBACK_CONTROLS)[number];

export interface MediaPlayerPlaybackCardFeatureConfig {
  type: "media-player-playback";
  controls?: MediaPlayerPlaybackControl[];
}

export interface MediaPlayerSourceCardFeatureConfig {
  type: "media-player-source";
}

export interface MediaPlayerVolumeSliderCardFeatureConfig {
  type: "media-player-volume-slider";
}

export interface MediaPlayerVolumeButtonsCardFeatureConfig {
  type: "media-player-volume-buttons";
  step?: number;
}

export interface MediaPlayerSoundModeCardFeatureConfig {
  type: "media-player-sound-mode";
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
  style?: "dropdown" | "icons";
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

export interface ValvePositionFavoriteCardFeatureConfig {
  type: "valve-position-favorite";
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
  detail?: boolean;
}

export interface HourlyForecastCardFeatureConfig {
  type: "hourly-forecast";
  hours_to_show?: number;
  show_temperature?: boolean;
  show_precipitation?: boolean;
  precipitation_type?: ForecastPrecipitationType;
}

export interface DailyForecastCardFeatureConfig {
  type: "daily-forecast";
  forecast_type?: "daily" | "twice_daily";
  days_to_show?: number;
  show_temperature?: boolean;
  show_current_temperature?: boolean;
  show_precipitation?: boolean;
  precipitation_type?: ForecastPrecipitationType;
}

export const AREA_CONTROL_DOMAINS = [
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

export type AreaControlDomain = (typeof AREA_CONTROL_DOMAINS)[number];

export type AreaControl = AreaControlDomain | { entity_id: string };

export interface AreaControlsCardFeatureConfig {
  type: "area-controls";
  controls?: AreaControl[];
}

export interface BarGaugeCardFeatureConfig {
  type: "bar-gauge";
  min?: number;
  max?: number;
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
  | CoverPositionFavoriteCardFeatureConfig
  | CoverTiltFavoriteCardFeatureConfig
  | CoverTiltPositionCardFeatureConfig
  | CoverTiltCardFeatureConfig
  | DateSetCardFeatureConfig
  | FanDirectionCardFeatureConfig
  | FanOscillateCardFeatureConfig
  | FanPresetModesCardFeatureConfig
  | FanSpeedCardFeatureConfig
  | TrendGraphCardFeatureConfig
  | HourlyForecastCardFeatureConfig
  | DailyForecastCardFeatureConfig
  | HumidifierToggleCardFeatureConfig
  | HumidifierModesCardFeatureConfig
  | LawnMowerCommandsCardFeatureConfig
  | LightBrightnessCardFeatureConfig
  | LightColorTempCardFeatureConfig
  | LightColorFavoritesCardFeatureConfig
  | LockCommandsCardFeatureConfig
  | LockOpenDoorCardFeatureConfig
  | MediaPlayerPlaybackCardFeatureConfig
  | MediaPlayerSoundModeCardFeatureConfig
  | MediaPlayerSourceCardFeatureConfig
  | MediaPlayerVolumeButtonsCardFeatureConfig
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
  | ValvePositionFavoriteCardFeatureConfig
  | ValvePositionCardFeatureConfig
  | WaterHeaterOperationModesCardFeatureConfig
  | AreaControlsCardFeatureConfig
  | BarGaugeCardFeatureConfig;

export interface LovelaceCardFeatureContext {
  entity_id?: string;
  area_id?: string;
}
