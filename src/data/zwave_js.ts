import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";
import { DeviceRegistryEntry } from "./device_registry";

export enum InclusionStrategy {
  /**
   * Always uses Security S2 if supported, otherwise uses Security S0 for certain devices which don't work without encryption and uses no encryption otherwise.
   *
   * Issues a warning if Security S0 or S2 is supported, but the secure bootstrapping fails.
   *
   * **This is the recommended** strategy and should be used unless there is a good reason not to.
   */
  Default = 0,
  /**
   * Include using SmartStart (requires Security S2).
   * Issues a warning if Security S2 is not supported, or the secure bootstrapping fails.
   *
   * **Should be preferred** over **Default** if supported.
   */
  SmartStart,

  /**
   * Don't use encryption, even if supported.
   *
   * **Not recommended**, because S2 should be used where possible.
   */
  Insecure,
  /**
   * Use Security S0, even if a higher security mode is supported.
   *
   * Issues a warning if Security S0 is not supported or the secure bootstrapping fails.
   *
   * **Not recommended** because S0 should be used sparingly and S2 preferred whereever possible.
   */
  Security_S0,
  /**
   * Use Security S2 and issue a warning if it is not supported or the secure bootstrapping fails.
   *
   * **Not recommended** because the *Default* strategy is more versatile and user-friendly.
   */
  Security_S2,
}

export enum SecurityClass {
  /**
   * Used internally during inclusion of a node. Don't use this!
   */
  Temporary = -2,
  /**
   * `None` is used to indicate that a node is included without security.
   * It is not meant as input to methods that accept a security class.
   */
  None = -1,
  S2_Unauthenticated = 0,
  S2_Authenticated = 1,
  S2_AccessControl = 2,
  S0_Legacy = 7,
}

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

export interface ZWaveJSNodeStatus {
  node_id: number;
  ready: boolean;
  status: number;
}

export interface ZwaveJSNodeMetadata {
  node_id: number;
  exclusion: string;
  inclusion: string;
  manual: string;
  wakeup: string;
  reset: string;
  device_database_url: string;
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

export interface RequestedGrant {
  /**
   * An array of security classes that are requested or to be granted.
   * The granted security classes MUST be a subset of the requested ones.
   */
  securityClasses: SecurityClass[];
  /** Whether client side authentication is requested or to be granted */
  clientSideAuth: boolean;
}

export const nodeStatus = ["unknown", "asleep", "awake", "dead", "alive"];

export interface ZWaveJsMigrationData {
  migration_device_map: Record<string, string>;
  zwave_entity_ids: string[];
  zwave_js_entity_ids: string[];
  migration_entity_map: Record<string, string>;
  migrated: boolean;
}

export const migrateZwave = (
  hass: HomeAssistant,
  entry_id: string,
  dry_run = true
): Promise<ZWaveJsMigrationData> =>
  hass.callWS({
    type: "zwave_js/migrate_zwave",
    entry_id,
    dry_run,
  });

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

export const subscribeAddNode = (
  hass: HomeAssistant,
  entry_id: string,
  callbackFunction: (message: any) => void,
  inclusion_strategy: InclusionStrategy = InclusionStrategy.Default
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage((message) => callbackFunction(message), {
    type: "zwave_js/add_node",
    entry_id: entry_id,
    inclusion_strategy,
  });

export const stopInclusion = (hass: HomeAssistant, entry_id: string) =>
  hass.callWS({
    type: "zwave_js/stop_inclusion",
    entry_id,
  });

export const grantSecurityClasses = (
  hass: HomeAssistant,
  entry_id: string,
  security_classes: SecurityClass[],
  client_side_auth?: boolean
) =>
  hass.callWS({
    type: "zwave_js/grant_security_classes",
    entry_id,
    security_classes,
    client_side_auth,
  });

export const validateDskAndEnterPin = (
  hass: HomeAssistant,
  entry_id: string,
  pin: string
) =>
  hass.callWS({
    type: "zwave_js/validate_dsk_and_enter_pin",
    entry_id,
    pin,
  });

export const fetchNodeStatus = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number
): Promise<ZWaveJSNodeStatus> =>
  hass.callWS({
    type: "zwave_js/node_status",
    entry_id,
    node_id,
  });

export const fetchNodeMetadata = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number
): Promise<ZwaveJSNodeMetadata> =>
  hass.callWS({
    type: "zwave_js/node_metadata",
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
      entry_id,
      node_id,
    }
  );

export const healNode = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number
): Promise<boolean> =>
  hass.callWS({
    type: "zwave_js/heal_node",
    entry_id,
    node_id,
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
      entry_id,
      node_id,
    }
  );

export const healNetwork = (
  hass: HomeAssistant,
  entry_id: string
): Promise<UnsubscribeFunc> =>
  hass.callWS({
    type: "zwave_js/begin_healing_network",
    entry_id,
  });

export const stopHealNetwork = (
  hass: HomeAssistant,
  entry_id: string
): Promise<UnsubscribeFunc> =>
  hass.callWS({
    type: "zwave_js/stop_healing_network",
    entry_id,
  });

export const subscribeNodeReady = (
  hass: HomeAssistant,
  entry_id: string,
  node_id: number,
  callbackFunction: (message) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/node_ready",
      entry_id,
      node_id,
    }
  );

export const subscribeHealNetworkProgress = (
  hass: HomeAssistant,
  entry_id: string,
  callbackFunction: (message: ZWaveJSHealNetworkStatusMessage) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(
    (message: any) => callbackFunction(message),
    {
      type: "zwave_js/subscribe_heal_network_progress",
      entry_id,
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
