import type { HomeAssistant } from "../../../types";
import { supportsAlarmModesCardFeature } from "./hui-alarm-modes-card-feature";
import { supportsAreaControlsCardFeature } from "./hui-area-controls-card-feature";
import { supportsBarGaugeCardFeature } from "./hui-bar-gauge-card-feature";
import { supportsButtonCardFeature } from "./hui-button-card-feature";
import { supportsClimateFanModesCardFeature } from "./hui-climate-fan-modes-card-feature";
import { supportsClimateHvacModesCardFeature } from "./hui-climate-hvac-modes-card-feature";
import { supportsClimatePresetModesCardFeature } from "./hui-climate-preset-modes-card-feature";
import { supportsClimateSwingHorizontalModesCardFeature } from "./hui-climate-swing-horizontal-modes-card-feature";
import { supportsClimateSwingModesCardFeature } from "./hui-climate-swing-modes-card-feature";
import { supportsCounterActionsCardFeature } from "./hui-counter-actions-card-feature";
import { supportsCoverOpenCloseCardFeature } from "./hui-cover-open-close-card-feature";
import { supportsCoverPositionFavoriteCardFeature } from "./hui-cover-position-favorite-card-feature";
import { supportsCoverPositionCardFeature } from "./hui-cover-position-card-feature";
import { supportsCoverTiltCardFeature } from "./hui-cover-tilt-card-feature";
import { supportsCoverTiltFavoriteCardFeature } from "./hui-cover-tilt-favorite-card-feature";
import { supportsCoverTiltPositionCardFeature } from "./hui-cover-tilt-position-card-feature";
import { supportsDateSetCardFeature } from "./hui-date-set-card-feature";
import { supportsFanDirectionCardFeature } from "./hui-fan-direction-card-feature";
import { supportsFanOscilatteCardFeature } from "./hui-fan-oscillate-card-feature";
import { supportsFanPresetModesCardFeature } from "./hui-fan-preset-modes-card-feature";
import { supportsFanSpeedCardFeature } from "./hui-fan-speed-card-feature";
import { supportsHumidifierModesCardFeature } from "./hui-humidifier-modes-card-feature";
import { supportsHumidifierToggleCardFeature } from "./hui-humidifier-toggle-card-feature";
import { supportsLawnMowerCommandCardFeature } from "./hui-lawn-mower-commands-card-feature";
import { supportsLightBrightnessCardFeature } from "./hui-light-brightness-card-feature";
import { supportsLightColorFavoritesCardFeature } from "./hui-light-color-favorites-card-feature";
import { supportsLightColorTempCardFeature } from "./hui-light-color-temp-card-feature";
import { supportsLockCommandsCardFeature } from "./hui-lock-commands-card-feature";
import { supportsLockOpenDoorCardFeature } from "./hui-lock-open-door-card-feature";
import { supportsMediaPlayerPlaybackCardFeature } from "./hui-media-player-playback-card-feature";
import { supportsMediaPlayerSoundModeCardFeature } from "./hui-media-player-sound-mode-card-feature";
import { supportsMediaPlayerSourceCardFeature } from "./hui-media-player-source-card-feature";
import { supportsMediaPlayerVolumeButtonsCardFeature } from "./hui-media-player-volume-buttons-card-feature";
import { supportsMediaPlayerVolumeSliderCardFeature } from "./hui-media-player-volume-slider-card-feature";
import { supportsNumericInputCardFeature } from "./hui-numeric-input-card-feature";
import { supportsSelectOptionsCardFeature } from "./hui-select-options-card-feature";
import { supportsTargetHumidityCardFeature } from "./hui-target-humidity-card-feature";
import { supportsTargetTemperatureCardFeature } from "./hui-target-temperature-card-feature";
import { supportsToggleCardFeature } from "./hui-toggle-card-feature";
import { supportsTrendGraphCardFeature } from "./hui-trend-graph-card-feature";
import { supportsUpdateActionsCardFeature } from "./hui-update-actions-card-feature";
import { supportsVacuumCommandsCardFeature } from "./hui-vacuum-commands-card-feature";
import { supportsValveOpenCloseCardFeature } from "./hui-valve-open-close-card-feature";
import { supportsValvePositionFavoriteCardFeature } from "./hui-valve-position-favorite-card-feature";
import { supportsValvePositionCardFeature } from "./hui-valve-position-card-feature";
import { supportsWaterHeaterOperationModesCardFeature } from "./hui-water-heater-operation-modes-card-feature";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export type FeatureType = LovelaceCardFeatureConfig["type"];

export type SupportsFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => boolean;

export const UI_FEATURE_TYPES = [
  "alarm-modes",
  "area-controls",
  "bar-gauge",
  "button",
  "climate-fan-modes",
  "climate-hvac-modes",
  "climate-preset-modes",
  "climate-swing-modes",
  "climate-swing-horizontal-modes",
  "counter-actions",
  "cover-open-close",
  "cover-position-favorite",
  "cover-position",
  "cover-tilt-favorite",
  "cover-tilt-position",
  "cover-tilt",
  "date-set",
  "fan-direction",
  "fan-oscillate",
  "fan-preset-modes",
  "fan-speed",
  "humidifier-modes",
  "humidifier-toggle",
  "lawn-mower-commands",
  "light-brightness",
  "light-color-temp",
  "light-color-favorites",
  "lock-commands",
  "lock-open-door",
  "media-player-playback",
  "media-player-sound-mode",
  "media-player-source",
  "media-player-volume-buttons",
  "media-player-volume-slider",
  "numeric-input",
  "select-options",
  "trend-graph",
  "target-humidity",
  "target-temperature",
  "toggle",
  "update-actions",
  "vacuum-commands",
  "valve-open-close",
  "valve-position-favorite",
  "valve-position",
  "water-heater-operation-modes",
] as const satisfies readonly FeatureType[];

export type UiFeatureType = (typeof UI_FEATURE_TYPES)[number];

export const SUPPORTS_FEATURE_TYPES: Record<UiFeatureType, SupportsFeature> = {
  "alarm-modes": supportsAlarmModesCardFeature,
  "area-controls": supportsAreaControlsCardFeature,
  "bar-gauge": supportsBarGaugeCardFeature,
  button: supportsButtonCardFeature,
  "climate-fan-modes": supportsClimateFanModesCardFeature,
  "climate-swing-modes": supportsClimateSwingModesCardFeature,
  "climate-swing-horizontal-modes":
    supportsClimateSwingHorizontalModesCardFeature,
  "climate-hvac-modes": supportsClimateHvacModesCardFeature,
  "climate-preset-modes": supportsClimatePresetModesCardFeature,
  "counter-actions": supportsCounterActionsCardFeature,
  "cover-open-close": supportsCoverOpenCloseCardFeature,
  "cover-position-favorite": supportsCoverPositionFavoriteCardFeature,
  "cover-position": supportsCoverPositionCardFeature,
  "cover-tilt-favorite": supportsCoverTiltFavoriteCardFeature,
  "cover-tilt-position": supportsCoverTiltPositionCardFeature,
  "cover-tilt": supportsCoverTiltCardFeature,
  "date-set": supportsDateSetCardFeature,
  "fan-direction": supportsFanDirectionCardFeature,
  "fan-oscillate": supportsFanOscilatteCardFeature,
  "fan-preset-modes": supportsFanPresetModesCardFeature,
  "fan-speed": supportsFanSpeedCardFeature,
  "humidifier-modes": supportsHumidifierModesCardFeature,
  "humidifier-toggle": supportsHumidifierToggleCardFeature,
  "lawn-mower-commands": supportsLawnMowerCommandCardFeature,
  "light-brightness": supportsLightBrightnessCardFeature,
  "light-color-temp": supportsLightColorTempCardFeature,
  "light-color-favorites": supportsLightColorFavoritesCardFeature,
  "lock-commands": supportsLockCommandsCardFeature,
  "lock-open-door": supportsLockOpenDoorCardFeature,
  "media-player-playback": supportsMediaPlayerPlaybackCardFeature,
  "media-player-sound-mode": supportsMediaPlayerSoundModeCardFeature,
  "media-player-source": supportsMediaPlayerSourceCardFeature,
  "media-player-volume-buttons": supportsMediaPlayerVolumeButtonsCardFeature,
  "media-player-volume-slider": supportsMediaPlayerVolumeSliderCardFeature,
  "numeric-input": supportsNumericInputCardFeature,
  "select-options": supportsSelectOptionsCardFeature,
  "trend-graph": supportsTrendGraphCardFeature,
  "target-humidity": supportsTargetHumidityCardFeature,
  "target-temperature": supportsTargetTemperatureCardFeature,
  toggle: supportsToggleCardFeature,
  "update-actions": supportsUpdateActionsCardFeature,
  "vacuum-commands": supportsVacuumCommandsCardFeature,
  "valve-open-close": supportsValveOpenCloseCardFeature,
  "valve-position-favorite": supportsValvePositionFavoriteCardFeature,
  "valve-position": supportsValvePositionCardFeature,
  "water-heater-operation-modes": supportsWaterHeaterOperationModesCardFeature,
};

export const supportsFeatureType = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext,
  type: UiFeatureType
): boolean => SUPPORTS_FEATURE_TYPES[type](hass, context);
