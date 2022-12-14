import { HassEntity } from "home-assistant-js-websocket";
import { batteryStateColor } from "./battery_color";

export const sensorColor = (
  stateObj: HassEntity,
  state: string
): string | undefined => {
  const deviceClass = stateObj?.attributes.device_class;

  if (deviceClass === "battery") {
    return batteryStateColor(state);
  }

  return undefined;
};
