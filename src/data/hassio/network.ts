import { atLeastVersion } from "../../common/config/version";
import type { HomeAssistant } from "../../types";
import type { HassioResponse } from "./common";
import { hassioApiResultExtractor } from "./common";

interface IpConfiguration {
  address: string[];
  gateway: string | null;
  method: "disabled" | "static" | "auto";
  nameservers: string[];
}

export interface NetworkInterface {
  primary: boolean;
  privacy: boolean;
  interface: string;
  enabled: boolean;
  ipv4?: Partial<IpConfiguration>;
  ipv6?: Partial<IpConfiguration>;
  type: "ethernet" | "wireless" | "vlan";
  wifi?: Partial<WifiConfiguration> | null;
}

export interface DockerNetwork {
  address: string;
  dns: string;
  gateway: string;
  interface: string;
}

export interface AccessPoint {
  mode: "infrastructure" | "mesh" | "adhoc" | "ap";
  ssid: string;
  mac: string;
  frequency: number;
  signal: number;
}

export interface AccessPoints {
  accesspoints: AccessPoint[];
}

export interface WifiConfiguration {
  mode: "infrastructure" | "mesh" | "adhoc" | "ap";
  auth: "open" | "wep" | "wpa-psk";
  ssid: string;
  signal: number;
  psk?: string;
}

export interface NetworkInfo {
  interfaces: NetworkInterface[];
  docker: DockerNetwork;
}

export const fetchNetworkInfo = async (
  hass: HomeAssistant
): Promise<NetworkInfo> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return hass.callWS({
      type: "supervisor/api",
      endpoint: "/network/info",
      method: "get",
    });
  }

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
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: `/network/interface/${network_interface}/update`,
      method: "post",
      data: options,
      timeout: null,
    });
    return;
  }

  await hass.callApi<HassioResponse<NetworkInfo>>(
    "POST",
    `hassio/network/interface/${network_interface}/update`,
    options
  );
};

export const accesspointScan = async (
  hass: HomeAssistant,
  network_interface: string
): Promise<AccessPoints> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return hass.callWS({
      type: "supervisor/api",
      endpoint: `/network/interface/${network_interface}/accesspoints`,
      method: "get",
      timeout: null,
    });
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<AccessPoints>>(
      "GET",
      `hassio/network/interface/${network_interface}/accesspoints`
    )
  );
};

export const parseAddress = (address: string) => {
  const [ip, cidr] = address.split("/");
  const isIPv6 = ip.includes(":");
  const mask = cidr ? cidrToNetmask(cidr, isIPv6) : null;
  return { ip, mask, prefix: cidr };
};

export const formatAddress = (ip: string, mask: string) =>
  `${ip}/${netmaskToCidr(mask)}`;

// Helper functions
export const cidrToNetmask = (cidr: string, isIPv6 = false): string => {
  const bits = parseInt(cidr, 10);
  if (isIPv6) {
    const fullMask = "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff";
    const numGroups = Math.floor(bits / 16);
    const remainingBits = bits % 16;
    const lastGroup = remainingBits
      ? parseInt(
          "1".repeat(remainingBits) + "0".repeat(16 - remainingBits),
          2
        ).toString(16)
      : "";
    return fullMask
      .split(":")
      .slice(0, numGroups)
      .concat(lastGroup)
      .concat(Array(8 - numGroups - (lastGroup ? 1 : 0)).fill("0"))
      .join(":");
  }
  /* eslint-disable no-bitwise */
  const mask = ~(2 ** (32 - bits) - 1);
  return [
    (mask >>> 24) & 255,
    (mask >>> 16) & 255,
    (mask >>> 8) & 255,
    mask & 255,
  ].join(".");
  /* eslint-enable no-bitwise */
};

export const netmaskToCidr = (netmask: string): number => {
  if (netmask.includes(":")) {
    // IPv6
    return netmask
      .split(":")
      .map((group) =>
        group ? (parseInt(group, 16).toString(2).match(/1/g) || []).length : 0
      )
      .reduce((sum, val) => sum + val, 0);
  }
  // IPv4
  return netmask
    .split(".")
    .reduce(
      (count, octet) =>
        count + (parseInt(octet, 10).toString(2).match(/1/g) || []).length,
      0
    );
};
