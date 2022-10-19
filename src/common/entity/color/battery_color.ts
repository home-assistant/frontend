import { HassEntity } from "home-assistant-js-websocket";

export const batteryStateColor = (stateObj: HassEntity) => {
  const value = Number(stateObj.state);
  const roundedValue = Math.round(value / 10) * 10;
  return `battery-${roundedValue}`;
};
