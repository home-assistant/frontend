import { HomeAssistant } from "../../types";

export interface HassioResponse<T> {
  data: T;
  result: "ok";
}

export const hassioApiResultExtractor = <T>(response: HassioResponse<T>) =>
  response.data;

export const extractApiErrorMessage = (error: any): string => {
  return typeof error === "object"
    ? typeof error.body === "object"
      ? error.body.message || "Unknown error, see logs"
      : error.body || "Unknown error, see logs"
    : error;
};

export const ignoredStatusCodes = new Set([502, 503, 504]);

export const fetchHassioStats = async (
  hass: HomeAssistant,
  container: string
) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<void>>("GET", `hassio/${container}/stats`)
  );
};
