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

export const binarySensorColor = (
  state: string,
  stateObj: HassEntity
): string | undefined => {
  const deviceClass = stateObj?.attributes.device_class;

  if (state === "on") {
    return deviceClass && NORMAL_DEVICE_CLASSES.has(deviceClass)
      ? "binary-sensor-normal-on"
      : "binary-sensor-danger-on";
  }
  if (state === "off") {
    return "binary-sensor-off";
  }
  return undefined;
};
