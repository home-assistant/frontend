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

export interface ZWaveJSNodeConfigParams {
  [key: string]: ZWaveJSNodeConfigParam;
}
export interface ZWaveJSNodeConfigParam {
  property: number;
  value: any;
  configuration_value_type: string;
  metadata: ZWaveJSNodeConfigParamMetadata;
  result?: string;
  error?: string;
}

export interface ZWaveJSNodeConfigParamMetadata {
  description: string;
  label: string;
  max: number;
  min: number;
  readable: boolean;
  writeable: boolean;
  type: string;
  unit: string;
  states: { [key: number]: string };
}

export interface ZWaveJSSetConfigParamData {
  type: string;
  entry_id: string;
  node_id: number;
  property: number;
  property_key?: number;
  value: string | number;
}

export interface ZWaveJSSetConfigParamResult {
  value_id?: string;
  status?: string;
  error?: string;
}

export interface ZWaveJSDataCollectionStatus {
  enabled: boolean;
  opted_in: boolean;
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

export const fetchDataCollectionStatus = (
  hass: HomeAssistant,
  entry_id: string
): Promise<ZWaveJSDataCollectionStatus> =>
  hass.callWS({
    type: "zwave_js/data_collection_status",
    entry_id,
  });

export const setDataCollectionPreference = (
  hass: HomeAssistant,
  entry_id: string,
  opted_in: boolean
): Promise<any> =>
  hass.callWS({
    type: "zwave_js/update_data_collection_preference",
    entry_id,
    opted_in,
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

export const fetchNodeConfigParameters = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number
): Promise<ZWaveJSNodeConfigParams> =>
  hass.callWS({
    type: "zwave_js/get_config_parameters",
    entry_id,
    node_id,
  });

export const setNodeConfigParameter = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number,
  property: number,
  value: number,
  property_key?: number
): Promise<ZWaveJSSetConfigParamResult> => {
  const data: ZWaveJSSetConfigParamData = {
    type: "zwave_js/set_config_parameter",
    entry_id,
    node_id,
    property,
    value,
    property_key,
  };
  return hass.callWS(data);
};

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
