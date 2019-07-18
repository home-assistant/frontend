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
  | "fan_only";

export type HvacAction = "off" | "heating" | "cooling" | "drying" | "idle";

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
