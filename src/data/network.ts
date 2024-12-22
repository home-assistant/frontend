import { HomeAssistant } from "../types";

export interface IPv6ConfiguredAddress {
  address: string;
  flowinfo: number;
  scope_id: number;
  network_prefix: number;
}

export interface IPv4ConfiguredAddress {
  address: string;
  network_prefix: number;
}

export interface Adapter {
  name: string;
  enabled: boolean;
  auto: boolean;
  default: boolean;
  ipv6: IPv6ConfiguredAddress[];
  ipv4: IPv4ConfiguredAddress[];
}

export interface NetworkConfig {
  adapters: Adapter[];
  configured_adapters: string[];
}

export const getNetworkConfig = (hass: HomeAssistant) =>
  hass.callWS<NetworkConfig>({
    type: "network",
  });

export const setNetworkConfig = (
  hass: HomeAssistant,
  configured_adapters: string[]
) =>
  hass.callWS<string[]>({
    type: "network/configure",
    config: {
      configured_adapters: configured_adapters,
    },
  });
