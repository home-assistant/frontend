import { HomeAssistant } from "../types";

export const documentationUrl = (hass: HomeAssistant, path: string) => {
  return `https://${
    hass.config.version.includes("b") ? "rc" : "www"
  }.home-assistant.io${path}`;
};
