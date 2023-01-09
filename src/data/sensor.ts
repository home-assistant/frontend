import { HomeAssistant } from "../types";

export const SENSOR_DEVICE_CLASS_BATTERY = "battery";
export const SENSOR_DEVICE_CLASS_TIMESTAMP = "timestamp";

export type SensorDeviceClassUnits = { units: string[] };

export const getSensorDeviceClassConvertibleUnits = (
  hass: HomeAssistant,
  deviceClass: string
): Promise<SensorDeviceClassUnits> =>
  hass.callWS({
    type: "sensor/device_class_convertible_units",
    device_class: deviceClass,
  });
