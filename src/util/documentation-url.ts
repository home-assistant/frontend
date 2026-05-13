import type { HomeAssistant } from "../types";

export const documentationUrl = (
  hassConfig: HomeAssistantConfig,
  path: string
) =>
  `https://${
    hass.config.version.includes("b")
      ? "rc"
      : hass.config.version.includes("dev")
        ? "next"
        : "www"
  }.home-assistant.io${path}`;
