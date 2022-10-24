import { HassEntity } from "home-assistant-js-websocket";

const SECURE_DEVICE_CLASSES = new Set(["door", "gate", "garage", "window"]);

export const coverColor = (stateObj?: HassEntity): string | undefined => {
  const isSecure =
    stateObj?.attributes.device_class &&
    SECURE_DEVICE_CLASSES.has(stateObj.attributes.device_class);
  return isSecure ? "cover-secure" : "cover";
};
