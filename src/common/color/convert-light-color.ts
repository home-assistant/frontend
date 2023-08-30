import { clamp } from "../number/clamp";

export const DEFAULT_MIN_KELVIN = 2700;
export const DEFAULT_MAX_KELVIN = 6500;

export const temperature2rgb = (
  temperature: number
): [number, number, number] => {
  const value = temperature / 100;
  return [
    temperatureRed(value),
    temperatureGreen(value),
    temperatureBlue(value),
  ];
};

const temperatureRed = (temperature: number): number => {
  if (temperature <= 66) {
    return 255;
  }
  const red = 329.698727446 * (temperature - 60) ** -0.1332047592;
  return clamp(red, 0, 255);
};

const temperatureGreen = (temperature: number): number => {
  let green: number;
  if (temperature <= 66) {
    green = 99.4708025861 * Math.log(temperature) - 161.1195681661;
  } else {
    green = 288.1221695283 * (temperature - 60) ** -0.0755148492;
  }
  return clamp(green, 0, 255);
};

const temperatureBlue = (temperature: number): number => {
  if (temperature >= 66) {
    return 255;
  }
  if (temperature <= 19) {
    return 0;
  }
  const blue = 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  return clamp(blue, 0, 255);
};

const matchMaxScale = (
  inputColors: number[],
  outputColors: number[]
): number[] => {
  const maxIn: number = Math.max(...inputColors);
  const maxOut: number = Math.max(...outputColors);
  let factor: number;
  if (maxOut === 0) {
    factor = 0.0;
  } else {
    factor = maxIn / maxOut;
  }
  return outputColors.map((value) => Math.round(value * factor));
};

const mired2kelvin = (miredTemperature: number) =>
  Math.floor(1000000 / miredTemperature);

const kelvin2mired = (kelvintTemperature: number) =>
  Math.floor(1000000 / kelvintTemperature);

export const rgbww2rgb = (
  rgbww: [number, number, number, number, number],
  minKelvin?: number,
  maxKelvin?: number
): [number, number, number] => {
  const [r, g, b, cw, ww] = rgbww;
  // Calculate color temperature of the white channels
  const maxMireds: number = kelvin2mired(minKelvin ?? DEFAULT_MIN_KELVIN);
  const minMireds: number = kelvin2mired(maxKelvin ?? DEFAULT_MAX_KELVIN);
  const miredRange: number = maxMireds - minMireds;
  let ctRatio: number;
  try {
    ctRatio = ww / (cw + ww);
  } catch (_error) {
    ctRatio = 0.5;
  }
  const colorTempMired = minMireds + ctRatio * miredRange;
  const colorTempKelvin = colorTempMired ? mired2kelvin(colorTempMired) : 0;
  const [wR, wG, wB] = temperature2rgb(colorTempKelvin);
  const whiteLevel = Math.max(cw, ww) / 255;

  // Add the white channels to the rgb channels.
  const rgb = [
    r + wR * whiteLevel,
    g + wG * whiteLevel,
    b + wB * whiteLevel,
  ] as [number, number, number];

  // Match the output maximum value to the input. This ensures the
  // output doesn't overflow.
  return matchMaxScale([r, g, b, cw, ww], rgb) as [number, number, number];
};

export const rgbw2rgb = (
  rgbw: [number, number, number, number]
): [number, number, number] => {
  const [r, g, b, w] = rgbw;
  const rgb = [r + w, g + w, b + w] as [number, number, number];
  return matchMaxScale([r, g, b, w], rgb) as [number, number, number];
};
