import { HomeAssistant } from "../types";
import { DeviceRegistryEntry } from "./device_registry";

export interface OZWNodeIdentifiers {
  ozw_instance: number;
  node_id: number;
}

export interface OZWDevice {
  node_id: number;
  node_query_stage: string;
  is_awake: boolean;
  is_failed: boolean;
  is_zwave_plus: boolean;
  ozw_instance: number;
  event: string;
  node_manufacturer_name: string;
  node_product_name: string;
}

export interface OZWDeviceMetaDataResponse {
  node_id: number;
  ozw_instance: number;
  metadata: OZWDeviceMetaData;
}

export interface OZWDeviceMetaData {
  OZWInfoURL: string;
  ZWAProductURL: string;
  ProductPic: string;
  Description: string;
  ProductManualURL: string;
  ProductPageURL: string;
  InclusionHelp: string;
  ExclusionHelp: string;
  ResetHelp: string;
  WakeupHelp: string;
  ProductSupportURL: string;
  Frequency: string;
  Name: string;
  ProductPicBase64: string;
}

export interface OZWInstance {
  ozw_instance: number;
  OZWDaemon_Version: string;
  OpenZWave_Version: string;
  QTOpenZWave_Version: string;
  Status: string;
  getControllerPath: string;
  homeID: string;
}

export interface OZWNetworkStatistics {
  ozw_instance: number;
  node_count: number;
  readCnt: number;
  writeCnt: number;
  ACKCnt: number;
  CANCnt: number;
  NAKCnt: number;
  dropped: number;
  retries: number;
}

export interface OZWDeviceConfig {
  label: string;
  type: string;
  value: string | number;
  parameter: number;
  min: number;
  max: number;
  help: string;
}

export interface OZWMigrationData {
  migration_device_map: Record<string, string>;
  zwave_entity_ids: string[];
  ozw_entity_ids: string[];
  migration_entity_map: Record<string, string>;
  migrated: boolean;
}

export const nodeQueryStages = [
  "ProtocolInfo",
  "Probe",
  "WakeUp",
  "ManufacturerSpecific1",
  "NodeInfo",
  "NodePlusInfo",
  "ManufacturerSpecific2",
  "Versions",
  "Instances",
  "Static",
  "CacheLoad",
  "Associations",
  "Neighbors",
  "Session",
  "Dynamic",
  "Configuration",
  "Complete",
];

export const networkOnlineStatuses = [
  "driverAllNodesQueried",
  "driverAllNodesQueriedSomeDead",
  "driverAwakeNodesQueried",
];
export const networkStartingStatuses = [
  "starting",
  "started",
  "Ready",
  "driverReady",
];
export const networkOfflineStatuses = [
  "Offline",
  "stopped",
  "driverFailed",
  "driverReset",
  "driverRemoved",
  "driverAllNodesOnFire",
];

export const getIdentifiersFromDevice = function (
  device: DeviceRegistryEntry
): OZWNodeIdentifiers | undefined {
  if (!device) {
    return undefined;
  }

  const ozwIdentifier = device.identifiers.find(
    (identifier) => identifier[0] === "ozw"
  );
  if (!ozwIdentifier) {
    return undefined;
  }

  const identifiers = ozwIdentifier[1].split(".");
  return {
    node_id: parseInt(identifiers[1]),
    ozw_instance: parseInt(identifiers[0]),
  };
};

export const fetchOZWInstances = (
  hass: HomeAssistant
): Promise<OZWInstance[]> =>
  hass.callWS({
    type: "ozw/get_instances",
  });

export const fetchOZWNetworkStatus = (
  hass: HomeAssistant,
  ozw_instance: number
): Promise<OZWInstance> =>
  hass.callWS({
    type: "ozw/network_status",
    ozw_instance,
  });

export const fetchOZWNetworkStatistics = (
  hass: HomeAssistant,
  ozw_instance: number
): Promise<OZWNetworkStatistics> =>
  hass.callWS({
    type: "ozw/network_statistics",
    ozw_instance,
  });

export const fetchOZWNodes = (
  hass: HomeAssistant,
  ozw_instance: number
): Promise<OZWDevice[]> =>
  hass.callWS({
    type: "ozw/get_nodes",
    ozw_instance,
  });

export const fetchOZWNodeStatus = (
  hass: HomeAssistant,
  ozw_instance: number,
  node_id: number
): Promise<OZWDevice> =>
  hass.callWS({
    type: "ozw/node_status",
    ozw_instance,
    node_id,
  });

export const fetchOZWNodeMetadata = (
  hass: HomeAssistant,
  ozw_instance: number,
  node_id: number
): Promise<OZWDeviceMetaDataResponse> =>
  hass.callWS({
    type: "ozw/node_metadata",
    ozw_instance,
    node_id,
  });

export const fetchOZWNodeConfig = (
  hass: HomeAssistant,
  ozw_instance: number,
  node_id: number
): Promise<OZWDeviceConfig[]> =>
  hass.callWS({
    type: "ozw/get_config_parameters",
    ozw_instance,
    node_id,
  });

export const refreshNodeInfo = (
  hass: HomeAssistant,
  ozw_instance: number,
  node_id: number
): Promise<OZWDevice> =>
  hass.callWS({
    type: "ozw/refresh_node_info",
    ozw_instance,
    node_id,
  });

export const migrateZwave = (
  hass: HomeAssistant,
  dry_run = true
): Promise<OZWMigrationData> =>
  hass.callWS({
    type: "ozw/migrate_zwave",
    dry_run,
  });
