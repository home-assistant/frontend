import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export type HassioHostInfo = any;

export interface HassioHassOSInfo {
  board: "ova" | "rpi";
  update_available: boolean;
  version_cli_latest: string;
  version_cli: string;
  version_latest: string;
  version: string;
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
