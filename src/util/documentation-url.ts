import type { HomeAssistantConfig } from "../types";

const DOCUMENTATION_DOMAIN = "home-assistant.io";

export const DOCUMENTATION_URL = `https://www.${DOCUMENTATION_DOMAIN}`;

export const documentationUrl = (
  { config }: Pick<HomeAssistantConfig, "config">,
  path: string
) => documentationUrlForVersion(config.version, path);

export const documentationUrlForVersion = (version: string, path: string) =>
  `https://${
    version.includes("b") ? "rc" : version.includes("dev") ? "next" : "www"
  }.${DOCUMENTATION_DOMAIN}${path}`;
