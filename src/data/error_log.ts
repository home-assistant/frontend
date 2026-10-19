import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { atLeastVersion } from "../common/config/version";
import type {
  HomeAssistantApi,
  HomeAssistantConfig,
  LogFileDisabledReason,
} from "../types";
import type { HassioAddonInfo } from "./hassio/addon";
import { supervisorUrl } from "./hassio/common";

export interface LogProvider {
  key: string;
  name: string;
  addon?: HassioAddonInfo;
}

const hasSupervisorCoreLogDownload = (config: HomeAssistantConfig): boolean =>
  isComponentLoaded(config.config, "hassio") &&
  atLeastVersion(config.config.version, 2025, 10);

export const fetchErrorLog = (api: HomeAssistantApi) =>
  api.callApi<string>("GET", "error_log");

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

export const getErrorLogDownloadUrl = (config: HomeAssistantConfig) =>
  hasSupervisorCoreLogDownload(config)
    ? supervisorUrl("core/logs/latest")
    : "/api/error_log";

export const getCoreLogFileDownloadUnavailableReason = (
  config: HomeAssistantConfig
): LogFileDisabledReason | undefined => {
  if (hasSupervisorCoreLogDownload(config)) {
    return undefined;
  }

  return config.config.logging?.log_file_disabled_reason ?? undefined;
};
