import type { HomeAssistant } from "../types";

export interface NumberDeviceClassUnits {
  units: string[];
}

export const getNumberDeviceClassConvertibleUnits = (
  hass: HomeAssistant,
  deviceClass: string
): Promise<NumberDeviceClassUnits> =>
  hass.callWS({
    type: "number/device_class_convertible_units",
    device_class: deviceClass,
  });

export interface ClampedValue {
  clamped: boolean;
  value: number;
}

/**
 * Clamp a value between a minimum and maximum value
 * @param value - The value to clamp
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns The clamped value
 */
export const clampValue = ({
  value,
  min,
  max,
}: {
  value: number;
  min?: number;
  max?: number;
}): ClampedValue => {
  if (max !== undefined && value >= max) {
    return { clamped: true, value: max };
  }

  if (min !== undefined && value < min) {
    return { clamped: true, value: min };
  }

  return { clamped: false, value };
};
