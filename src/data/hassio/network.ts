import type { HomeAssistant } from "../../types";

export type InterfaceMethod = "disabled" | "static" | "auto";

export type InterfaceType = "ethernet" | "wireless" | "vlan";

export type InterfaceAddrGenMode =
  "eui64" | "stable-privacy" | "default-or-eui64" | "default";

export type InterfaceIp6Privacy =
  "default" | "disabled" | "enabled-prefer-public" | "enabled";

export type MulticastDnsMode = "default" | "off" | "resolve" | "announce";

export type WifiMode = "infrastructure" | "mesh" | "adhoc" | "ap";

export type AuthMethod = "open" | "wep" | "wpa-psk";

export interface IpConfiguration {
  method: InterfaceMethod;
  address: string[];
  nameservers: string[];
  gateway: string | null;
  route_metric: number | null;
  ready: boolean | null;
}

export interface Ip6Configuration extends IpConfiguration {
  addr_gen_mode: InterfaceAddrGenMode;
  ip6_privacy: InterfaceIp6Privacy;
}

export interface WifiConfiguration {
  mode: WifiMode;
  auth: AuthMethod;
  ssid: string;
  signal: number | null;
}

export interface VlanConfiguration {
  id: number;
  parent: string | null;
}

export interface NetworkInterface {
  interface: string;
  type: InterfaceType;
  enabled: boolean;
  connected: boolean;
  primary: boolean;
  mac: string;
  ipv4: IpConfiguration | null;
  ipv6: Ip6Configuration | null;
  wifi: WifiConfiguration | null;
  vlan: VlanConfiguration | null;
  mdns: MulticastDnsMode | null;
  llmnr: MulticastDnsMode | null;
}

/** Wifi fields accepted by the interface update endpoint. */
export interface WifiConfigurationUpdate {
  mode?: WifiMode;
  auth?: AuthMethod;
  ssid?: string;
  psk?: string;
}

/** Body accepted by the interface update endpoint. */
export interface NetworkInterfaceUpdate {
  enabled?: boolean;
  mdns?: MulticastDnsMode;
  llmnr?: MulticastDnsMode;
  ipv4?: Partial<
    Pick<
      IpConfiguration,
      "address" | "method" | "gateway" | "route_metric" | "nameservers"
    >
  >;
  ipv6?: Partial<
    Pick<
      Ip6Configuration,
      | "address"
      | "method"
      | "addr_gen_mode"
      | "ip6_privacy"
      | "gateway"
      | "route_metric"
      | "nameservers"
    >
  >;
  wifi?: WifiConfigurationUpdate;
}

export interface DockerNetwork {
  address: string;
  dns: string;
  gateway: string;
  interface: string;
}

export interface AccessPoint {
  mode: WifiMode;
  ssid: string;
  mac: string;
  frequency: number;
  signal: number;
}

export interface AccessPoints {
  accesspoints: AccessPoint[];
}

export interface NetworkInfo {
  interfaces: NetworkInterface[];
  docker: DockerNetwork;
  host_internet: boolean | null;
  supervisor_internet: boolean;
}

export const fetchNetworkInfo = async (
  hass: HomeAssistant
): Promise<NetworkInfo> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/network/info",
    method: "get",
  });

export const updateNetworkInterface = async (
  hass: HomeAssistant,
  network_interface: string,
  options: NetworkInterfaceUpdate
) => {
  await hass.callWS({
    type: "supervisor/api",
    endpoint: `/network/interface/${network_interface}/update`,
    method: "post",
    data: options,
    timeout: null,
  });
};

export const accesspointScan = async (
  hass: HomeAssistant,
  network_interface: string
): Promise<AccessPoints> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/network/interface/${network_interface}/accesspoints`,
    method: "get",
    timeout: null,
  });

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
