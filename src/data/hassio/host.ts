import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export type HassioHostInfo = {
  chassis: string;
  cpe: string;
  deployment: string;
  disk_life_time: number | "";
  disk_free: number;
  disk_total: number;
  disk_used: number;
  features: string[];
  hostname: string;
  kernel: string;
  operating_system: string;
};

export interface HassioHassOSInfo {
  board: string | null;
  boot: string | null;
  update_available: boolean;
  version_latest: string | null;
  version: string | null;
}

export const fetchHassioHostInfo = async (hass: HomeAssistant) => {
  const response = await hass.callApi<HassioResponse<HassioHostInfo>>(
    "GET",
    "hassio/host/info"
  );
  return hassioApiResultExtractor(response);
};

export const fetchHassioHassOsInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioHassOSInfo>>(
      "GET",
      "hassio/os/info"
    )
  );
};

export const rebootHost = async (hass: HomeAssistant) => {
  return hass.callApi<HassioResponse<void>>("POST", "hassio/host/reboot");
};

export const shutdownHost = async (hass: HomeAssistant) => {
  return hass.callApi<HassioResponse<void>>("POST", "hassio/host/shutdown");
};

export const updateOS = async (hass: HomeAssistant) => {
  return hass.callApi<HassioResponse<void>>("POST", "hassio/os/update");
};

export const configSyncOS = async (hass: HomeAssistant) => {
  return hass.callApi<HassioResponse<void>>("POST", "hassio/os/config/sync");
};

export const changeHostOptions = async (hass: HomeAssistant, options: any) => {
  return hass.callApi<HassioResponse<void>>(
    "POST",
    "hassio/host/options",
    options
  );
};
