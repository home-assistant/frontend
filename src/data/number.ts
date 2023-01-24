import { HomeAssistant } from "../types";

export type NumberDeviceClassUnits = { units: string[] };

export const getNumberDeviceClassConvertibleUnits = (
  hass: HomeAssistant,
  deviceClass: string
): Promise<NumberDeviceClassUnits> =>
  hass.callWS({
    type: "number/device_class_convertible_units",
    device_class: deviceClass,
  });
