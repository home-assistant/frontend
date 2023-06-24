import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { temperature2rgb } from "../common/color/convert-light-color";

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
  ) || false;

export const lightSupportsBrightness = (entity: LightEntity) =>
  entity.attributes.supported_color_modes?.some((mode) =>
    modesSupportingBrightness.includes(mode)
  ) || false;

export const lightSupportsFavoriteColors = (entity: LightEntity) =>
  lightSupportsColor(entity) ||
  lightSupportsColorMode(entity, LightColorMode.COLOR_TEMP);

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

export type LightColor =
  | {
      color_temp_kelvin: number;
    }
  | {
      hs_color: [number, number];
    }
  | {
      rgb_color: [number, number, number];
    }
  | {
      rgbw_color: [number, number, number, number];
    }
  | {
      rgbww_color: [number, number, number, number, number];
    };

const COLOR_TEMP_COUNT = 4;
const DEFAULT_COLORED_COLORS = [
  { rgb_color: [127, 172, 255] }, // blue #7FACFF
  { rgb_color: [215, 150, 255] }, // purple #D796FF
  { rgb_color: [255, 158, 243] }, // pink #FF9EF3
  { rgb_color: [255, 110, 84] }, // red #FF6E54
] as LightColor[];

export const computeDefaultFavoriteColors = (
  stateObj: LightEntity
): LightColor[] => {
  const colors: LightColor[] = [];

  const supportsColorTemp = lightSupportsColorMode(
    stateObj,
    LightColorMode.COLOR_TEMP
  );

  const supportsColor = lightSupportsColor(stateObj);

  if (supportsColorTemp) {
    const min = stateObj.attributes.min_color_temp_kelvin!;
    const max = stateObj.attributes.max_color_temp_kelvin!;
    const step = (max - min) / (COLOR_TEMP_COUNT - 1);

    for (let i = 0; i < COLOR_TEMP_COUNT; i++) {
      colors.push({
        color_temp_kelvin: Math.round(min + step * i),
      });
    }
  } else if (supportsColor) {
    const min = 2000;
    const max = 6500;
    const step = (max - min) / (COLOR_TEMP_COUNT - 1);

    for (let i = 0; i < COLOR_TEMP_COUNT; i++) {
      colors.push({
        rgb_color: temperature2rgb(Math.round(min + step * i)),
      });
    }
  }

  if (supportsColor) {
    colors.push(...DEFAULT_COLORED_COLORS);
  }

  return colors;
};

export const formatTempColor = (value: number) => `${value} K`;
