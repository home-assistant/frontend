import { HassEntity } from "home-assistant-js-websocket";

export default function hasLocation(stateObj: HassEntity) {
  return (
    "latitude" in stateObj.attributes && "longitude" in stateObj.attributes
  );
}
