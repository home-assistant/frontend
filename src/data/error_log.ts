import { HomeAssistant } from "../types";

export interface LogProvider {
  key: string;
  name: string;
}

export const fetchErrorLog = (hass: HomeAssistant) =>
  hass.callApi<string>("GET", "error_log");

export const getErrorLogDownloadUrl = "/api/error_log";
