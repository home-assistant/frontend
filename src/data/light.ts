import type {
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

const COLOR_TEMP_COUNT = 5;
const DEFAULT_COLORED_COLORS = [
  { rgb_color: [255, 85, 85] }, // Red    #FF5555
  { rgb_color: [40, 240, 60] }, // Green  #28F03C
  { rgb_color: [60, 140, 255] }, // Blue   #3C8CFF
  { rgb_color: [255, 215, 60] }, // Yellow #FFD73C
  { rgb_color: [210, 90, 255] }, // Purple #D25AFF
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

  if (supportsColorTemp || supportsColor) {
    const min = supportsColorTemp
      ? stateObj.attributes.min_color_temp_kelvin!
      : 2000;
    const max = supportsColorTemp
      ? stateObj.attributes.max_color_temp_kelvin!
      : 6500;

    const steps = new Set<number>([min, max]);
    [
      2700, // Warm White
      4000, // Neutral White
      5500, // Daylight
    ].forEach((preset) => {
      if (
        preset >= min + 250 &&
        preset <= max - 250 &&
        steps.size < COLOR_TEMP_COUNT
      ) {
        steps.add(preset);
      }
    });

    const kelvinSteps = Array.from(steps).sort((a, b) => a - b);
    while (kelvinSteps.length < COLOR_TEMP_COUNT) {
      let maxGap = 0;
      let insertIndex = 1;

      for (let i = 0; i < kelvinSteps.length - 1; i++) {
        const gap = kelvinSteps[i + 1] - kelvinSteps[i];

        if (gap > maxGap) {
          maxGap = gap;
          insertIndex = i + 1;
        }
      }

      const midpoint = Math.round(kelvinSteps[insertIndex - 1] + maxGap / 2);
      kelvinSteps.splice(insertIndex, 0, midpoint);
    }

    kelvinSteps.forEach((kelvin) => {
      if (supportsColorTemp) {
        colors.push({ color_temp_kelvin: kelvin });
      } else {
        colors.push({ rgb_color: temperature2rgb(kelvin) });
      }
    });
  }

  if (supportsColor) {
    colors.push(...DEFAULT_COLORED_COLORS);
  }

  return colors;
};
