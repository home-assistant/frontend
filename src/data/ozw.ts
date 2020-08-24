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

export const fetchOZWNodeStatus = (
  hass: HomeAssistant,
  ozw_instance: number,
  node_id: number
): Promise<OZWDevice> =>
  hass.callWS({
    type: "ozw/node_status",
    ozw_instance: ozw_instance,
    node_id: node_id,
  });

export const fetchOZWNodeMetadata = (
  hass: HomeAssistant,
  ozw_instance: number,
  node_id: number
): Promise<OZWDeviceMetaDataResponse> =>
  hass.callWS({
    type: "ozw/node_metadata",
    ozw_instance: ozw_instance,
    node_id: node_id,
  });

export const refreshNodeInfo = (
  hass: HomeAssistant,
  ozw_instance: number,
  node_id: number
): Promise<OZWDevice> =>
  hass.callWS({
    type: "ozw/refresh_node_info",
    ozw_instance: ozw_instance,
    node_id: node_id,
  });
