import type { HomeAssistant } from "../types";

export const SENSOR_DEVICE_CLASS_BATTERY = "battery";
export const SENSOR_DEVICE_CLASS_TIMESTAMP = "timestamp";
export const SENSOR_DEVICE_CLASS_TEMPERATURE = "temperature";
export const SENSOR_DEVICE_CLASS_HUMIDITY = "humidity";

export interface SensorDeviceClassUnits {
  units: string[];
}

export const getSensorDeviceClassConvertibleUnits = (
  hass: HomeAssistant,
  deviceClass: string
): Promise<SensorDeviceClassUnits> =>
  hass.callWS({
    type: "sensor/device_class_convertible_units",
    device_class: deviceClass,
  });

export interface SensorNumericDeviceClasses {
  numeric_device_classes: string[];
}

let sensorNumericDeviceClassesCache:
  | Promise<SensorNumericDeviceClasses>
  | undefined;

export const getSensorNumericDeviceClasses = async (
  hass: HomeAssistant
): Promise<SensorNumericDeviceClasses> => {
  if (sensorNumericDeviceClassesCache) {
    return sensorNumericDeviceClassesCache;
  }
  sensorNumericDeviceClassesCache = hass.callWS({
    type: "sensor/numeric_device_classes",
  });
  return sensorNumericDeviceClassesCache!;
};
