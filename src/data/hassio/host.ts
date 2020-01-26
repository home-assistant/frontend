import { HomeAssistant } from "../../types";
import { HassioResponse, hassioApiResultExtractor } from "./common";

export type HassioHostInfo = any;

export interface HassioHassOSInfo {
  version: string;
  version_cli: string;
  version_latest: string;
  version_cli_latest: string;
  board: "ova" | "rpi";
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
      "hassio/hassos/info"
    )
  );
};
