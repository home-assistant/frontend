import type { HomeAssistantConfig } from "../types";

const DOCUMENTATION_DOMAIN = "home-assistant.io";

export const DOCUMENTATION_URL = `https://www.${DOCUMENTATION_DOMAIN}`;

export const documentationUrl = (hass: HomeAssistantConfig, path: string) =>
  `https://${
    hass.config.version.includes("b")
      ? "rc"
      : hass.config.version.includes("dev")
        ? "next"
        : "www"
  }.${DOCUMENTATION_DOMAIN}${path}`;
