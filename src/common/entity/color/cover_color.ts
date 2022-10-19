import { HassEntity } from "home-assistant-js-websocket";
import { DomainColor } from "../domain_color";

const SECURE_DEVICE_CLASSES = new Set(["door", "gate", "garage", "window"]);

export const coverColor = (
  state?: string,
  stateObj?: HassEntity
): DomainColor => {
  if (state === "closed") return "cover-off";

  if (
    stateObj?.attributes.device_class &&
    SECURE_DEVICE_CLASSES.has(stateObj.attributes.device_class)
  ) {
    return "cover-secure-on";
  }

  return "cover-on";
};
