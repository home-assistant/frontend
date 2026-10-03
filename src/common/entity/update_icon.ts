import type { HassEntity } from "home-assistant-js-websocket";
import type { UpdateEntity } from "../../data/update";
import { updateIsInstalling } from "../../data/update";

export const updateIcon = (stateObj: HassEntity, state?: string) => {
  const compareState = state ?? stateObj.state;
  // An install can be in progress even when the state is "off", e.g. when
  // downgrading firmware. Show the installing icon regardless of state.
  if (updateIsInstalling(stateObj as UpdateEntity)) {
    return "mdi:package-down";
  }
  return compareState === "on" ? "mdi:package-up" : "mdi:package";
};
