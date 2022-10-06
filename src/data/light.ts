import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export const enum LightEntityFeature {
  EFFECT = 4,
  FLASH = 8,
  TRANSITION = 32,
}

export const enum LightColorMode {
  UNKNOWN = "unknown",
  ONOFF = "onoff",
  BRIGHTNESS = "brightness",
  COLOR_TEMP = "color_temp",
  HS = "hs",
  XY = "xy",
  RGB = "rgb",
  RGBW = "rgbw",
  RGBWW = "rgbww",
  WHITE = "white",
}

const modesSupportingColor = [
  LightColorMode.HS,
  LightColorMode.XY,
  LightColorMode.RGB,
  LightColorMode.RGBW,
  LightColorMode.RGBWW,
];

const modesSupportingBrightness = [
  ...modesSupportingColor,
  LightColorMode.COLOR_TEMP,
  LightColorMode.BRIGHTNESS,
  LightColorMode.WHITE,
];

export const lightSupportsColorMode = (
  entity: LightEntity,
  mode: LightColorMode
) => entity.attributes.supported_color_modes?.includes(mode) || false;

export const lightIsInColorMode = (entity: LightEntity) =>
  (entity.attributes.color_mode &&
    modesSupportingColor.includes(entity.attributes.color_mode)) ||
  false;

export const lightSupportsColor = (entity: LightEntity) =>
  entity.attributes.supported_color_modes?.some((mode) =>
    modesSupportingColor.includes(mode)
  );

export const lightSupportsBrightness = (entity: LightEntity) =>
  entity.attributes.supported_color_modes?.some((mode) =>
    modesSupportingBrightness.includes(mode)
  ) || false;

export const getLightCurrentModeRgbColor = (
  entity: LightEntity
): number[] | undefined =>
  entity.attributes.color_mode === LightColorMode.RGBWW
    ? entity.attributes.rgbww_color
    : entity.attributes.color_mode === LightColorMode.RGBW
    ? entity.attributes.rgbw_color
    : entity.attributes.rgb_color;

interface LightEntityAttributes extends HassEntityAttributeBase {
  min_color_temp_kelvin?: number;
  max_color_temp_kelvin?: number;
  min_mireds?: number;
  max_mireds?: number;
  brightness?: number;
  xy_color?: [number, number];
  hs_color?: [number, number];
  color_temp?: number;
  color_temp_kelvin?: number;
  rgb_color?: [number, number, number];
  rgbw_color?: [number, number, number, number];
  rgbww_color?: [number, number, number, number, number];
  effect?: string;
  effect_list?: string[] | null;
  supported_color_modes?: LightColorMode[];
  color_mode?: LightColorMode;
}

export interface LightEntity extends HassEntityBase {
  attributes: LightEntityAttributes;
}
