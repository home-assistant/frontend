/** Return an icon representing a number state. */
import { HassEntity } from "home-assistant-js-websocket";
import { FIXED_DEVICE_CLASS_ICONS } from "../const";

export const numberIcon = (stateObj?: HassEntity): string | undefined => {
  const dclass = stateObj?.attributes.device_class;

  if (dclass && dclass in FIXED_DEVICE_CLASS_ICONS) {
    return FIXED_DEVICE_CLASS_ICONS[dclass];
  }

  return undefined;
};
