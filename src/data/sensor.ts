import { SENSOR_NUMERIC_DEVICE_CLASSES } from "./sensor_numeric_device_classes";
import type { HomeAssistant } from "../types";

export const SENSOR_DEVICE_CLASS_BATTERY = "battery";
export const SENSOR_DEVICE_CLASS_TIMESTAMP = "timestamp";
export const SENSOR_DEVICE_CLASS_TEMPERATURE = "temperature";
export const SENSOR_DEVICE_CLASS_HUMIDITY = "humidity";
export const SENSOR_DEVICE_CLASS_UPTIME = "uptime";

export const SENSOR_TIMESTAMP_DEVICE_CLASSES: (string | undefined)[] = [
  "timestamp",
  "uptime",
];

export const isNumericSensorDeviceClass = (deviceClass?: string): boolean =>
  deviceClass != null && SENSOR_NUMERIC_DEVICE_CLASSES.includes(deviceClass);

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
