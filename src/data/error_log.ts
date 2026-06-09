import { isComponentLoaded } from "../common/config/is_component_loaded";
import { atLeastVersion } from "../common/config/version";
import type { HomeAssistant } from "../types";
import type { HassioAddonInfo } from "./hassio/addon";

export interface LogProvider {
  key: string;
  name: string;
  addon?: HassioAddonInfo;
}

export type ManagedLogFileDisabledReason = "environment" | "supervisor";

interface LoggingConfig {
  managed_log_file: boolean;
  managed_log_file_disabled_reason: ManagedLogFileDisabledReason | null;
}

const hasSupervisorCoreLogDownload = (hass: HomeAssistant): boolean =>
  isComponentLoaded(hass.config, "hassio") &&
  atLeastVersion(hass.config.version, 2025, 10);

const getLoggingConfig = (hass: HomeAssistant): LoggingConfig | undefined =>
  (hass.config as HomeAssistant["config"] & { logging?: LoggingConfig })
    .logging;

export const fetchErrorLog = (hass: HomeAssistant) =>
  hass.callApi<string>("GET", "error_log");

export const getErrorLogDownloadUrl = (hass: HomeAssistant) =>
  hasSupervisorCoreLogDownload(hass)
    ? "/api/hassio/core/logs/latest"
    : "/api/error_log";

export const getCoreLogFileDownloadUnavailableReason = (
  hass: HomeAssistant
): ManagedLogFileDisabledReason | undefined => {
  if (hasSupervisorCoreLogDownload(hass)) {
    return undefined;
  }

  const logging = getLoggingConfig(hass);

  if (logging?.managed_log_file !== false) {
    return undefined;
  }

  return logging.managed_log_file_disabled_reason ?? "environment";
};
