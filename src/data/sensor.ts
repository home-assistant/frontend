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

export type SensorNumericDeviceClasses = {
  numeric_device_classes: string[];
};

let sensorNumericDeviceClassesCache: SensorNumericDeviceClasses | undefined;

export const getSensorNumericDeviceClasses = async (
  hass: HomeAssistant
): Promise<SensorNumericDeviceClasses> => {
  if (sensorNumericDeviceClassesCache) {
    return sensorNumericDeviceClassesCache;
  }
  sensorNumericDeviceClassesCache = await hass.callWS({
    type: "sensor/numeric_device_classes",
  });
  return sensorNumericDeviceClassesCache!;
};
