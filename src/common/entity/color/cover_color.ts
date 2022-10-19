import { HassEntity } from "home-assistant-js-websocket";

const SECURE_DEVICE_CLASSES = new Set(["door", "gate", "garage", "window"]);

export const coverColor = (
  state?: string,
  stateObj?: HassEntity
): string | undefined => {
  if (state === "closed" || state === "closing") return "cover-closed";

  if (state === "open" || state === "opening") {
    const isSecure =
      stateObj?.attributes.device_class &&
      SECURE_DEVICE_CLASSES.has(stateObj.attributes.device_class);
    return isSecure ? "cover-secure-open" : "cover-open";
  }

  return undefined;
};
