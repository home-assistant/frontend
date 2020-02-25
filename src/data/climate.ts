import {
  HassEntityBase,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";

export type HvacMode =
  | "off"
  | "heat"
  | "cool"
  | "heat_cool"
  | "auto"
  | "dry"
  | "moist"
  | "fan_only";

export const CLIMATE_PRESET_NONE = "none";

export type HvacAction =
  | "off"
  | "heating"
  | "cooling"
  | "drying"
  | "moisting"
  | "idle";

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

export const CLIMATE_SUPPORT_TARGET_TEMPERATURE = 1;
export const CLIMATE_SUPPORT_TARGET_TEMPERATURE_RANGE = 2;
export const CLIMATE_SUPPORT_TARGET_HUMIDITY = 4;
export const CLIMATE_SUPPORT_FAN_MODE = 8;
export const CLIMATE_SUPPORT_PRESET_MODE = 16;
export const CLIMATE_SUPPORT_SWING_MODE = 32;
export const CLIMATE_SUPPORT_AUX_HEAT = 64;

const hvacModeOrdering: { [key in HvacMode]: number } = {
  auto: 1,
  heat_cool: 2,
  heat: 3,
  cool: 4,
  dry: 5,
  moist: 6,
  fan_only: 7,
  off: 8,
};

export const compareClimateHvacModes = (mode1: HvacMode, mode2: HvacMode) =>
  hvacModeOrdering[mode1] - hvacModeOrdering[mode2];
