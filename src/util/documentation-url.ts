import type { HomeAssistantConfig } from "../types";

export const documentationUrl = (hass: HomeAssistantConfig, path: string) =>
  `https://${
    hass.config.version.includes("b")
      ? "rc"
      : hass.config.version.includes("dev")
        ? "next"
        : "www"
  }.home-assistant.io${path}`;
