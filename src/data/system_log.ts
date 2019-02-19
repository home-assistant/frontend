import { HomeAssistant } from "../types";

export interface LoggedError {
  message: string;
  level: string;
  source: string;
  // unix timestamp in seconds
  timestamp: number;
  exception: string;
  count: number;
  // unix timestamp in seconds
  first_occured: number;
}

export const fetchSystemLog = (hass: HomeAssistant) =>
  hass.callApi<LoggedError[]>("GET", "error/all");
