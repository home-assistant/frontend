import { HomeAssistant } from "../types";
import { DeviceRegistryEntry } from "./device_registry";

export interface ZWaveJSNodeIdentifiers {
  home_id: string;
  node_id: number;
}
export interface ZWaveJSNetwork {
  client: ZWaveJSClient;
  controller: ZWaveJSController;
}

export interface ZWaveJSClient {
  state: string;
  ws_server_url: string;
  server_version: string;
  driver_version: string;
}

export interface ZWaveJSController {
  home_id: string;
  nodes: number[];
}

export interface ZWaveJSNode {
  node_id: number;
  ready: boolean;
  status: number;
}

export enum NodeStatus {
  Unknown,
  Asleep,
  Awake,
  Dead,
  Alive,
}

export const nodeStatus = ["unknown", "asleep", "awake", "dead", "alive"];

export const fetchNetworkStatus = (
  hass: HomeAssistant,
  entry_id: string
): Promise<ZWaveJSNetwork> =>
  hass.callWS({
    type: "zwave_js/network_status",
    entry_id,
  });

export const fetchNodeStatus = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number
): Promise<ZWaveJSNode> =>
  hass.callWS({
    type: "zwave_js/node_status",
    entry_id,
    node_id,
  });

export const getIdentifiersFromDevice = function (
  device: DeviceRegistryEntry
): ZWaveJSNodeIdentifiers | undefined {
  if (!device) {
    return undefined;
  }

  const zwaveJSIdentifier = device.identifiers.find(
    (identifier) => identifier[0] === "zwave_js"
  );
  if (!zwaveJSIdentifier) {
    return undefined;
  }

  const identifiers = zwaveJSIdentifier[1].split("-");
  return {
    node_id: parseInt(identifiers[1]),
    home_id: identifiers[0],
  };
};
