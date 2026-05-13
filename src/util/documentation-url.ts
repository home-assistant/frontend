import type { HomeAssistant } from "../types";

export const documentationUrl = (
  hass: Pick<HomeAssistant, "config">,
  path: string
) =>
  `https://${
    hass.config.version.includes("b")
      ? "rc"
      : hass.config.version.includes("dev")
        ? "next"
        : "www"
  }.home-assistant.io${path}`;
