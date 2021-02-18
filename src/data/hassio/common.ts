import { atLeastVersion } from "../../common/config/version";
import { HomeAssistant } from "../../types";

export interface HassioResponse<T> {
  data: T;
  result: "ok";
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

export const extractApiErrorMessage = (error: any): string => {
  return typeof error === "object"
    ? typeof error.body === "object"
      ? error.body.message || "Unknown error, see supervisor logs"
      : error.body || error.message || "Unknown error, see supervisor logs"
    : error;
};

export const ignoredStatusCodes = new Set([502, 503, 504]);

export const fetchHassioStats = async (
  hass: HomeAssistant,
  container: string
): Promise<HassioStats> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return await hass.callWS({
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
