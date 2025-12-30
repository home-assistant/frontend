import { isComponentLoaded } from "../common/config/is_component_loaded";
import { atLeastVersion } from "../common/config/version";
import type { HomeAssistant } from "../types";
import type { HassioAddonInfo } from "./hassio/addon";

export interface LogProvider {
  key: string;
  name: string;
  addon?: HassioAddonInfo;
}

export const fetchErrorLog = (hass: HomeAssistant) =>
  hass.callApi<string>("GET", "error_log");

export const getErrorLogDownloadUrl = (hass: HomeAssistant) =>
  isComponentLoaded(hass, "hassio") &&
  atLeastVersion(hass.config.version, 2025, 10)
    ? "/api/hassio/core/logs/latest"
    : "/api/error_log";
