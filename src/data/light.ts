import {
  HassEntityAttributeBase,
  HassEntityBase,
  HassEntity,
} from "home-assistant-js-websocket";

export enum LightColorModes {
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

export const computeLightColor = (entity: HassEntity) => {
  if (entity.state === "off") {
    return "";
  }
  if (entity.attributes.rgb_color) {
    return `rgb(${entity.attributes.rgb_color.join(",")})`;
  }
  if (entity.attributes.color_temp) {
    return `rgb(${colorTemperatureToRGB(entity.attributes.color_temp).join(
      ","
    )})`;
  }
  return "";
};

export const colorTemperatureToRGB = (
  color_temperature_mireds: number
): number[] => {
  // Return an RGB color from a color temperature in mireds.
  //
  // This is a rough approximation based on the formula provided by T. Helland
  // http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
  const color_temp_kelvin = Math.floor(1000000 / color_temperature_mireds);
  const internal = Math.min(40000, Math.max(1000, color_temp_kelvin)) / 100.0;
  return [_getRed(internal), _getGreen(internal), _getBlue(internal)];
};

export const _clamp_rgb = (rgb: number) => Math.max(Math.min(rgb, 255), 0);

export const _getRed = (temperature: number) => {
  // Get the red component of the temperature in RGB space."""
  if (temperature <= 66) {
    return 255;
  }
  return _clamp_rgb(329.698727446 * (temperature - 60) ** -0.1332047592);
};

export const _getGreen = (temperature: number) => {
  // Get the green component of the temperature in RGB space."""
  if (temperature <= 66) {
    return _clamp_rgb(99.4708025861 * Math.log(temperature) - 161.1195681661);
  }
  return _clamp_rgb(288.1221695283 * (temperature - 60) ** -0.0755148492);
};

export const _getBlue = (temperature: number) => {
  // Get the blue component of the temperature in RGB space."""
  if (temperature >= 66) {
    return 255;
  }
  if (temperature <= 19) {
    return 0;
  }
  return _clamp_rgb(
    138.5177312231 * Math.log(temperature - 10) - 305.0447927307
  );
};

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
