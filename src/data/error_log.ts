import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { atLeastVersion } from "../common/config/version";
import type { HomeAssistant, LogFileDisabledReason } from "../types";
import type { HassioAddonInfo } from "./hassio/addon";
import { supervisorUrl } from "./hassio/common";

export interface LogProvider {
  key: string;
  name: string;
  addon?: HassioAddonInfo;
}

const hasSupervisorCoreLogDownload = (hass: HomeAssistant): boolean =>
  isComponentLoaded(hass.config, "hassio") &&
  atLeastVersion(hass.config.version, 2025, 10);

export const fetchErrorLog = (hass: HomeAssistant) =>
  hass.callApi<string>("GET", "error_log");

export const subscribeIntegrationLog = (
  connection: Connection,
  integration: string,
  callback: (lines: string[]) => void
): Promise<UnsubscribeFunc> =>
  connection.subscribeMessage<string[]>(
    callback,
    { type: "system_log/subscribe_raw", integration },
    // The log file lines would be sent again after a reconnect, so callers
    // subscribe again themselves when the connection is ready
    { resubscribe: false }
  );

export const getErrorLogDownloadUrl = (hass: HomeAssistant) =>
  hasSupervisorCoreLogDownload(hass)
    ? supervisorUrl("core/logs/latest")
    : "/api/error_log";

export const getCoreLogFileDownloadUnavailableReason = (
  hass: HomeAssistant
): LogFileDisabledReason | undefined => {
  if (hasSupervisorCoreLogDownload(hass)) {
    return undefined;
  }

  return hass.config.logging?.log_file_disabled_reason ?? undefined;
};
