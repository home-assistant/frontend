import type { LocalizeFunc } from "../../common/translations/localize";
import { SENSOR_NUMERIC_DEVICE_CLASSES } from "../sensor_entity_constants";

export const NO_DEVICE_CLASS = "none";

// Mirrors core's `<Domain>DeviceClass` enums, until the backend exposes them.
export const DOMAIN_DEVICE_CLASSES: Record<string, readonly string[]> = {
  binary_sensor: [
    "battery",
    "battery_charging",
    "carbon_monoxide",
    "cold",
    "connectivity",
    "door",
    "garage_door",
    "gas",
    "heat",
    "light",
    "lock",
    "moisture",
    "motion",
    "moving",
    "occupancy",
    "opening",
    "plug",
    "power",
    "presence",
    "problem",
    "running",
    "safety",
    "smoke",
    "sound",
    "tamper",
    "update",
    "vibration",
    "window",
  ],
  button: ["identify", "restart", "update"],
  cover: [
    "awning",
    "blind",
    "curtain",
    "damper",
    "door",
    "garage",
    "gate",
    "shade",
    "shutter",
    "window",
  ],
  event: ["button", "doorbell", "motion"],
  humidifier: ["dehumidifier", "humidifier"],
  image_processing: ["alpr", "face", "ocr"],
  infrared: ["emitter", "receiver"],
  media_player: ["projector", "receiver", "speaker", "tv"],
  number: SENSOR_NUMERIC_DEVICE_CLASSES,
  sensor: [
    ...SENSOR_NUMERIC_DEVICE_CLASSES,
    "date",
    "enum",
    "timestamp",
    "uptime",
  ],
  switch: ["outlet", "switch"],
  update: ["firmware"],
  valve: ["gas", "water"],
};

export const computeDeviceClassName = (
  localize: LocalizeFunc,
  domain: string,
  deviceClass: string
): string =>
  localize(`component.${domain}.entity_component.${deviceClass}.name`) ||
  deviceClass;
