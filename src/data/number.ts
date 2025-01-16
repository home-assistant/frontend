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
