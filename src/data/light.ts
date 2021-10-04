import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export const enum LightColorModes {
  UNKNOWN = "unknown",
  ONOFF = "onoff",
  BRIGHTNESS = "brightness",
  COLOR_TEMP = "color_temp",
  WHITE = "white",
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
) => entity.attributes.supported_color_modes?.includes(mode);

export const lightIsInColorMode = (entity: LightEntity) =>
  modesSupportingColor.includes(entity.attributes.color_mode);

export const lightSupportsColor = (entity: LightEntity) =>
  entity.attributes.supported_color_modes?.some((mode) =>
    modesSupportingColor.includes(mode)
  );

export const lightSupportsDimming = (entity: LightEntity) =>
  entity.attributes.supported_color_modes?.some((mode) =>
    modesSupportingDimming.includes(mode)
  );

export const getLightCurrentModeRgbColor = (entity: LightEntity): number[] =>
  entity.attributes.color_mode === LightColorModes.RGBWW
    ? entity.attributes.rgbww_color
    : entity.attributes.color_mode === LightColorModes.RGBW
    ? entity.attributes.rgbw_color
    : entity.attributes.rgb_color;

interface LightEntityAttributes extends HassEntityAttributeBase {
  min_mireds: number;
  max_mireds: number;
  friendly_name: string;
  brightness: number;
  hs_color: [number, number];
  rgb_color: [number, number, number];
  rgbw_color: [number, number, number, number];
  rgbww_color: [number, number, number, number, number];
  color_temp: number;
  effect?: string;
  effect_list: string[] | null;
  supported_color_modes: LightColorModes[];
  color_mode: LightColorModes;
}

export interface LightEntity extends HassEntityBase {
  attributes: LightEntityAttributes;
}
