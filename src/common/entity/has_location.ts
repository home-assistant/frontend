import { HassEntity } from "home-assistant-js-websocket";

export const hasLocation = (stateObj: HassEntity) => {
  return (
    "latitude" in stateObj.attributes && "longitude" in stateObj.attributes
  );
};
