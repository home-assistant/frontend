import { HassEntity } from "home-assistant-js-websocket";

const ALERTING_DEVICE_CLASSES = new Set([
  "battery",
  "carbon_monoxide",
  "gas",
  "heat",
  "moisture",
  "problem",
  "safety",
  "smoke",
  "tamper",
  "door",
  "garage_door",
  "window",
  "opening",
]);

export const binarySensorColor = (stateObj: HassEntity): string | undefined => {
  const deviceClass = stateObj?.attributes.device_class;

  return deviceClass && ALERTING_DEVICE_CLASSES.has(deviceClass)
    ? "binary-sensor-alerting"
    : "binary-sensor";
};
