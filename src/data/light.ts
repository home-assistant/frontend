import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export enum LightColorModes {
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
  LightColorModes.HS,
  LightColorModes.XY,
  LightColorModes.RGB,
  LightColorModes.RGBW,
  LightColorModes.RGBWW,
];

const modesSupportingDimming = [
  ...modesSupportingColor,
  LightColorModes.COLOR_TEMP,
  LightColorModes.BRIGHTNESS,
];

export const SUPPORT_EFFECT = 4;
export const SUPPORT_FLASH = 8;
export const SUPPORT_TRANSITION = 32;

export const lightSupportsColorMode = (
  entity: LightEntity,
  mode: LightColorModes
) => {
  return entity.attributes.supported_color_modes.includes(mode);
};

export const lightSupportsColor = (entity: LightEntity) => {
  return entity.attributes.supported_color_modes.some((mode) =>
    modesSupportingColor.includes(mode)
  );
};

export const lightSupportsDimming = (entity: LightEntity) => {
  return entity.attributes.supported_color_modes.some((mode) =>
    modesSupportingDimming.includes(mode)
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
  supported_color_modes: LightColorModes[];
  color_mode: LightColorModes;
}

export interface LightEntity extends HassEntityBase {
  attributes: LightEntityAttributes;
}
