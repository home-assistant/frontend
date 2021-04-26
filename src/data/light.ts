import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

interface LightEntityAttributes extends HassEntityAttributeBase {
  min_mireds: number;
  max_mireds: number;
  friendly_name: string;
  brightness: number;
  hs_color: number[];
  color_temp: number;
  white_value: number;
  effect?: string;
  effect_list: string[] | null;
}

export interface LightEntity extends HassEntityBase {
  attributes: LightEntityAttributes;
}

export const SUPPORT_BRIGHTNESS = 1;
export const SUPPORT_COLOR_TEMP = 2;
export const SUPPORT_EFFECT = 4;
export const SUPPORT_FLASH = 8;
export const SUPPORT_COLOR = 16;
export const SUPPORT_TRANSITION = 32;
export const SUPPORT_WHITE_VALUE = 128;
