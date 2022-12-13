import { HassEntity } from "home-assistant-js-websocket";
import { UpdateEntity, updateIsInstalling } from "../../../data/update";
import { stateActive } from "../state_active";

export const updateColor = (
  stateObj: HassEntity,
  state: string
): string | undefined => {
  if (!stateActive(stateObj, state)) {
    return undefined;
  }
  return updateIsInstalling(stateObj as UpdateEntity)
    ? "update-installing"
    : "update";
};
