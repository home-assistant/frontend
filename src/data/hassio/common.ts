import { atLeastVersion } from "../../common/config/version";
import { HomeAssistant } from "../../types";

export interface HassioResponse<T> {
  data: T;
  message?: string;
  result: "ok" | "error";
}

export interface HassioStats {
  blk_read: number;
  blk_write: number;
  cpu_percent: number;
  memory_limit: number;
  memory_percent: number;
  memory_usage: number;
  network_rx: number;
  network_tx: number;
}

export const hassioApiResultExtractor = <T>(response: HassioResponse<T>) =>
  response.data;

export const extractApiErrorMessage = (error: any): string =>
  typeof error === "object"
    ? typeof error.body === "object"
      ? error.body.message || "Unknown error, see supervisor logs"
      : error.body || error.message || "Unknown error, see supervisor logs"
    : error;

const ignoredStatusCodes = new Set([502, 503, 504]);

export const ignoreSupervisorError = (error): boolean => {
  if (error && error.status_code && ignoredStatusCodes.has(error.status_code)) {
    return true;
  }
  if (
    error &&
    error.message &&
    (error.message.includes("ERR_CONNECTION_CLOSED") ||
      error.message.includes("ERR_CONNECTION_RESET"))
  ) {
    return true;
  }
  return false;
};

export const fetchHassioStats = async (
  hass: HomeAssistant,
  container: string
): Promise<HassioStats> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return hass.callWS({
      type: "supervisor/api",
      endpoint: `/${container}/stats`,
      method: "get",
    });
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioStats>>(
      "GET",
      `hassio/${container}/stats`
    )
  );
};
