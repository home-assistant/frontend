import { HomeAssistant } from "../types";

export const fetchSystemLog = (hass: HomeAssistant) =>
  hass.callApi<string>("GET", "error_log");
