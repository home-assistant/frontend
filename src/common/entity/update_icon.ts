import { HassEntity } from "home-assistant-js-websocket";
import { UpdateEntity, updateIsInstalling } from "../../data/update";

export const updateIcon = (stateObj: HassEntity, state?: string) => {
  const compareState = state ?? stateObj.state;
  return compareState === "on"
    ? updateIsInstalling(stateObj as UpdateEntity)
      ? "mdi:package-down"
      : "mdi:package-up"
    : "mdi:package";
};
