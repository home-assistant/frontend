import { HomeAssistant } from "../types";

export interface HomeAssistantSystemHealthInfo {
  version: string;
  dev: boolean;
  hassio: boolean;
  virtualenv: string;
  python_version: string;
  docker: boolean;
  arch: string;
  timezone: string;
  os_name: string;
}

export interface SystemHealthInfo {
  [domain: string]: { [key: string]: string | number | boolean };
}

export const fetchSystemHealthInfo = (
  hass: HomeAssistant
): Promise<SystemHealthInfo> =>
  hass.callWS({
    type: "system_health/info",
  });
