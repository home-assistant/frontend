import { HassEntity } from "home-assistant-js-websocket";
import { batteryStateColorProperty } from "./battery_color";

export const sensorColor = (
  stateObj: HassEntity,
  state: string
): string | undefined => {
  const deviceClass = stateObj?.attributes.device_class;

  if (deviceClass === "battery") {
    return batteryStateColorProperty(state);
  }

  return undefined;
};
