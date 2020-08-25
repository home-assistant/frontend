import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export interface NetworkInterface {
  gateway: string;
  id: string;
  ip_address: string;
  address?: string;
  method: "static" | "dhcp";
  nameservers: string[] | string;
  dns?: string[];
  primary: boolean;
  type: string;
}

export interface NetworkInterfaces {
  [key: string]: NetworkInterface;
}

export interface NetworkInfo {
  interfaces: NetworkInterfaces;
}

export const fetchNetworkInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<NetworkInfo>>(
      "GET",
      "hassio/network/info"
    )
  );
};

export const updateNetworkInterface = async (
  hass: HomeAssistant,
  network_interface: string,
  options: Partial<NetworkInterface>
) => {
  await hass.callApi<HassioResponse<NetworkInfo>>(
    "POST",
    `hassio/network/interface/${network_interface}/update`,
    options
  );
};
