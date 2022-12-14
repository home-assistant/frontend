import { HassEntity } from "home-assistant-js-websocket";
import { stateActive } from "../state_active";

const ALERTING_DEVICE_CLASSES = new Set([
  "battery",
  "carbon_monoxide",
  "gas",
  "heat",
  "lock",
  "moisture",
  "problem",
  "safety",
  "smoke",
  "tamper",
]);

export const binarySensorColor = (
  stateObj: HassEntity,
  state: string
): string | undefined => {
  const deviceClass = stateObj?.attributes.device_class;

  if (!stateActive(stateObj, state)) {
    return undefined;
  }
  return deviceClass && ALERTING_DEVICE_CLASSES.has(deviceClass)
    ? "binary-sensor-alerting"
    : "binary-sensor";
};
