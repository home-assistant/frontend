import { UnsubscribeFunc } from "home-assistant-js-websocket";
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
  is_heal_network_active: boolean;
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

export interface ZWaveJSRefreshNodeStatusMessage {
  event: string;
  stage?: string;
}

export interface ZWaveJSHealNetworkStatusMessage {
  event: string;
  heal_node_status: { [key: number]: string };
}

export interface ZWaveJSRemovedNode {
  node_id: number;
  manufacturer: string;
  label: string;
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

export const reinterviewNode = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number,
  callbackFunction: (message: ZWaveJSRefreshNodeStatusMessage) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/refresh_node_info",
      entry_id: entry_id,
      node_id: node_id,
    }
  );

export const healNode = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number
): Promise<boolean> =>
  hass.callWS({
    type: "zwave_js/heal_node",
    entry_id: entry_id,
    node_id: node_id,
  });

export const removeFailedNode = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number,
  callbackFunction: (message: any) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/remove_failed_node",
      entry_id: entry_id,
      node_id: node_id,
    }
  );

export const healNetwork = (
  hass: HomeAssistant,
  entry_id: string
): Promise<UnsubscribeFunc> =>
  hass.callWS({
    type: "zwave_js/begin_healing_network",
    entry_id: entry_id,
  });

export const stopHealNetwork = (
  hass: HomeAssistant,
  entry_id: string
): Promise<UnsubscribeFunc> =>
  hass.callWS({
    type: "zwave_js/stop_healing_network",
    entry_id: entry_id,
  });

export const subscribeHealNetworkProgress = (
  hass: HomeAssistant,
  entry_id: string,
  callbackFunction: (message: ZWaveJSHealNetworkStatusMessage) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/subscribe_heal_network_progress",
      entry_id: entry_id,
    }
  );

export const getIdentifiersFromDevice = (
  device: DeviceRegistryEntry
): ZWaveJSNodeIdentifiers | undefined => {
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

export type ZWaveJSLogUpdate = ZWaveJSLogMessageUpdate | ZWaveJSLogConfigUpdate;

interface ZWaveJSLogMessageUpdate {
  type: "log_message";
  log_message: ZWaveJSLogMessage;
}

interface ZWaveJSLogConfigUpdate {
  type: "log_config";
  log_config: ZWaveJSLogConfig;
}

export interface ZWaveJSLogMessage {
  timestamp: string;
  level: string;
  primary_tags: string;
  message: string | string[];
}

export const subscribeZWaveJSLogs = (
  hass: HomeAssistant,
  entry_id: string,
  callback: (update: ZWaveJSLogUpdate) => void
) =>
  hass.connection.subscribeMessage<ZWaveJSLogUpdate>(callback, {
    type: "zwave_js/subscribe_log_updates",
    entry_id,
  });

export interface ZWaveJSLogConfig {
  level: string;
  enabled: boolean;
  filename: string;
  log_to_file: boolean;
  force_console: boolean;
}

export const fetchZWaveJSLogConfig = (
  hass: HomeAssistant,
  entry_id: string
): Promise<ZWaveJSLogConfig> =>
  hass.callWS({
    type: "zwave_js/get_log_config",
    entry_id,
  });

export const setZWaveJSLogLevel = (
  hass: HomeAssistant,
  entry_id: string,
  level: string
): Promise<ZWaveJSLogConfig> =>
  hass.callWS({
    type: "zwave_js/update_log_config",
    entry_id,
    config: { level },
  });
