import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export enum ColorModes {
  UNKNOWN = "unknown",
  ONOFF = "onoff",
  BRIGHTNESS = "brightness",
  COLOR_TEMP = "color_temp",
  HS = "hs",
  XY = "xy",
  RGB = "rgb",
  RGBW = "rgbw",
  RGBWW = "rgbww",
}

const modesSupportingColor = [
  ColorModes.HS,
  ColorModes.XY,
  ColorModes.RGB,
  ColorModes.RGBW,
  ColorModes.RGBWW,
];

export const SUPPORT_EFFECT = 4;
export const SUPPORT_FLASH = 8;
export const SUPPORT_TRANSITION = 32;

export const supportsLightMode = (entity: LightEntity, mode: ColorModes) => {
  return entity.attributes.supported_color_modes.includes(mode);
};

export const supportsColor = (entity: LightEntity) => {
  return entity.attributes.supported_color_modes.some((mode) =>
    modesSupportingColor.includes(mode)
  );
};

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
  supported_color_modes: ColorModes[];
  color_mode: ColorModes;
}

export interface LightEntity extends HassEntityBase {
  attributes: LightEntityAttributes;
}
