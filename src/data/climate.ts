import {
  mdiAccountArrowRight,
  mdiArrowAll,
  mdiArrowLeftRight,
  mdiArrowUpDown,
  mdiBed,
  mdiCircleMedium,
  mdiClockOutline,
  mdiFan,
  mdiFanAuto,
  mdiFanOff,
  mdiFire,
  mdiHeatWave,
  mdiHome,
  mdiLeaf,
  mdiMotionSensor,
  mdiPower,
  mdiRocketLaunch,
  mdiSnowflake,
  mdiSofa,
  mdiSpeedometer,
  mdiSpeedometerMedium,
  mdiSpeedometerSlow,
  mdiSunSnowflakeVariant,
  mdiTarget,
  mdiThermostatAuto,
  mdiWaterPercent,
  mdiWeatherWindy,
} from "@mdi/js";
import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { haOscillatingOff } from "./icons/haOscillatingOff";
import { haOscillating } from "./icons/haOscillating";

export const HVAC_MODES = [
  "auto",
  "heat_cool",
  "heat",
  "cool",
  "dry",
  "fan_only",
  "off",
] as const;

export type HvacMode = (typeof HVAC_MODES)[number];

export const CLIMATE_PRESET_NONE = "none";

export type HvacAction =
  | "off"
  | "preheating"
  | "heating"
  | "cooling"
  | "drying"
  | "idle"
  | "fan";

export type ClimateEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    hvac_mode: HvacMode;
    hvac_modes: HvacMode[];
    hvac_action?: HvacAction;
    current_temperature: number;
    min_temp: number;
    max_temp: number;
    temperature: number;
    target_temp_step?: number;
    target_temp_high?: number;
    target_temp_low?: number;
    humidity?: number;
    current_humidity?: number;
    target_humidity_low?: number;
    target_humidity_high?: number;
    min_humidity?: number;
    max_humidity?: number;
    fan_mode?: string;
    fan_modes?: string[];
    preset_mode?: string;
    preset_modes?: string[];
    swing_mode?: string;
    swing_modes?: string[];
    aux_heat?: "on" | "off";
  };
};

export const enum ClimateEntityFeature {
  TARGET_TEMPERATURE = 1,
  TARGET_TEMPERATURE_RANGE = 2,
  TARGET_HUMIDITY = 4,
  FAN_MODE = 8,
  PRESET_MODE = 16,
  SWING_MODE = 32,
  AUX_HEAT = 64,
}

const hvacModeOrdering = HVAC_MODES.reduce(
  (order, mode, index) => {
    order[mode] = index;
    return order;
  },
  {} as Record<HvacMode, number>
);

export const compareClimateHvacModes = (mode1: HvacMode, mode2: HvacMode) =>
  hvacModeOrdering[mode1] - hvacModeOrdering[mode2];

export const CLIMATE_HVAC_ACTION_TO_MODE: Record<HvacAction, HvacMode> = {
  cooling: "cool",
  drying: "dry",
  fan: "fan_only",
  preheating: "heat",
  heating: "heat",
  idle: "off",
  off: "off",
};

export const CLIMATE_HVAC_ACTION_ICONS: Record<HvacAction, string> = {
  cooling: mdiSnowflake,
  drying: mdiWaterPercent,
  fan: mdiFan,
  heating: mdiFire,
  idle: mdiClockOutline,
  off: mdiPower,
  preheating: mdiHeatWave,
};

export const CLIMATE_HVAC_MODE_ICONS: Record<HvacMode, string> = {
  cool: mdiSnowflake,
  dry: mdiWaterPercent,
  fan_only: mdiFan,
  auto: mdiThermostatAuto,
  heat: mdiFire,
  off: mdiPower,
  heat_cool: mdiSunSnowflakeVariant,
};

export const computeHvacModeIcon = (mode: HvacMode) =>
  CLIMATE_HVAC_MODE_ICONS[mode];

type ClimateBuiltInPresetMode =
  | "eco"
  | "away"
  | "boost"
  | "comfort"
  | "home"
  | "sleep"
  | "activity";

export const CLIMATE_PRESET_MODE_ICONS: Record<
  ClimateBuiltInPresetMode,
  string
> = {
  away: mdiAccountArrowRight,
  boost: mdiRocketLaunch,
  comfort: mdiSofa,
  eco: mdiLeaf,
  home: mdiHome,
  sleep: mdiBed,
  activity: mdiMotionSensor,
};

export const computePresetModeIcon = (mode: string) =>
  mode in CLIMATE_PRESET_MODE_ICONS
    ? CLIMATE_PRESET_MODE_ICONS[mode]
    : mdiCircleMedium;

type ClimateBuiltInFanMode =
  | "on"
  | "off"
  | "auto"
  | "low"
  | "medium"
  | "high"
  | "middle"
  | "focus"
  | "diffuse";

export const CLIMATE_FAN_MODE_ICONS: Record<ClimateBuiltInFanMode, string> = {
  on: mdiFan,
  off: mdiFanOff,
  auto: mdiFanAuto,
  low: mdiSpeedometerSlow,
  medium: mdiSpeedometerMedium,
  high: mdiSpeedometer,
  middle: mdiSpeedometerMedium,
  focus: mdiTarget,
  diffuse: mdiWeatherWindy,
};

export const computeFanModeIcon = (mode: string) =>
  mode in CLIMATE_FAN_MODE_ICONS
    ? CLIMATE_FAN_MODE_ICONS[mode]
    : mdiCircleMedium;

type ClimateBuiltInSwingMode =
  | "off"
  | "on"
  | "vertical"
  | "horizontal"
  | "both";

export const CLIMATE_SWING_MODE_ICONS: Record<ClimateBuiltInSwingMode, string> =
  {
    on: haOscillating,
    off: haOscillatingOff,
    vertical: mdiArrowUpDown,
    horizontal: mdiArrowLeftRight,
    both: mdiArrowAll,
  };

export const computeSwingModeIcon = (mode: string) =>
  mode in CLIMATE_SWING_MODE_ICONS
    ? CLIMATE_SWING_MODE_ICONS[mode]
    : mdiCircleMedium;
