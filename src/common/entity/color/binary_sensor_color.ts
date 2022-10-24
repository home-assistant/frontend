import { HassEntity } from "home-assistant-js-websocket";

const NORMAL_DEVICE_CLASSES = new Set([
  "battery_charging",
  "connectivity",
  "light",
  "moving",
  "plug",
  "power",
  "presence",
  "running",
]);

export const binarySensorColor = (stateObj: HassEntity): string | undefined => {
  const deviceClass = stateObj?.attributes.device_class;

  return deviceClass && NORMAL_DEVICE_CLASSES.has(deviceClass)
    ? "binary-sensor"
    : "binary-sensor-danger";
};
