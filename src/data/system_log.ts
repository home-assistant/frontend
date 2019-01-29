import { HomeAssistant } from "../types";

export interface LoggedError {
  message: string;
  level: string;
  source: string;
  // unix timestamp in seconds
  timestamp: number;
  exception: string;
}

export const fetchSystemLog = (hass: HomeAssistant) =>
  hass.callApi<LoggedError[]>("GET", "error/all");
