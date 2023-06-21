import { HassEntity } from "home-assistant-js-websocket";
import type { HaFormSchema } from "../components/ha-form/types";
import { HomeAssistant } from "../types";

export interface ZHAEntityReference extends HassEntity {
  name: string;
  original_name?: string;
}

export interface ZHADevice {
  available: boolean;
  name: string;
  ieee: string;
  nwk: string;
  lqi: string;
  rssi: string;
  last_seen: string;
  manufacturer: string;
  model: string;
  quirk_applied: boolean;
  quirk_class: string;
  entities: ZHAEntityReference[];
  manufacturer_code: number;
  device_reg_id: string;
  user_given_name?: string;
  power_source?: string;
  area_id?: string;
  device_type: string;
  active_coordinator: boolean;
  signature: any;
  neighbors: Neighbor[];
  pairing_status?: string;
}

export interface Neighbor {
  ieee: string;
  nwk: string;
  lqi: string;
  depth: string;
  relationship: string;
}

export interface ZHADeviceEndpoint {
  device: ZHADevice;
  endpoint_id: number;
  entities: ZHAEntityReference[];
}

export interface Attribute {
  name: string;
  id: number;
}

export interface Cluster {
  name: string;
  id: number;
  endpoint_id: number;
  type: string;
}

export interface ClusterConfigurationData {
  cluster_name: string;
  cluster_id: number;
  success: boolean;
}

export interface ClusterAttributeData {
  cluster_name: string;
  cluster_id: number;
  attributes: AttributeConfigurationStatus[];
}

export interface AttributeConfigurationStatus {
  id: number;
  name: string;
  success: boolean | undefined;
  min: number;
  max: number;
  change: number;
}

export interface ClusterConfigurationStatus {
  cluster: Cluster;
  bindSuccess: boolean | undefined;
  attributes: Map<number, AttributeConfigurationStatus>;
}

interface ClusterConfigurationBindEvent {
  type: "zha_channel_bind";
  zha_channel_msg_data: ClusterConfigurationData;
}

interface ClusterConfigurationReportConfigurationEvent {
  type: "zha_channel_configure_reporting";
  zha_channel_msg_data: ClusterAttributeData;
}

interface ClusterConfigurationEventFinish {
  type: "zha_channel_cfg_done";
}

export type ClusterConfigurationEvent =
  | ClusterConfigurationReportConfigurationEvent
  | ClusterConfigurationBindEvent
  | ClusterConfigurationEventFinish;

export interface Command {
  name: string;
  id: number;
  type: string;
  schema: HaFormSchema[];
}

export interface ReadAttributeServiceData {
  ieee: string;
  endpoint_id: number;
  cluster_id: number;
  cluster_type: string;
  attribute: number;
  manufacturer?: number;
}

export interface ZHAGroup {
  name: string;
  group_id: number;
  members: ZHADeviceEndpoint[];
}

export interface ZHAConfiguration {
  data: Record<string, Record<string, unknown>>;
  schemas: Record<string, HaFormSchema[]>;
}

export interface ZHANetworkBackupNodeInfo {
  nwk: string;
  ieee: string;
  logical_type: "coordinator" | "router" | "end_device";
}

export interface ZHANetworkBackupKey {
  key: string;
  tx_counter: number;
  rx_counter: number;
  seq: number;
  partner_ieee: string;
}

export interface ZHANetworkBackupNetworkInfo {
  extended_pan_id: string;
  pan_id: string;
  nwk_update_id: number;
  nwk_manager_id: string;
  channel: number;
  channel_mask: number[];
  security_level: number;
  network_key: ZHANetworkBackupKey;
  tc_link_key: ZHANetworkBackupKey;
  key_table: ZHANetworkBackupKey[];
  children: string[];
  nwk_addresses: Record<string, string>;
  stack_specific?: Record<string, any>;
  metadata: Record<string, any>;
  source: string;
}

export interface ZHANetworkBackup {
  backup_time: string;
  network_info: ZHANetworkBackupNetworkInfo;
  node_info: ZHANetworkBackupNodeInfo;
}

export interface ZHADeviceSettings {
  path: string;
  baudrate?: number;
  flow_control?: string;
}

export interface ZHANetworkSettings {
  settings: ZHANetworkBackup;
  radio_type: "ezsp" | "znp" | "deconz" | "zigate" | "xbee";
  device: ZHADeviceSettings;
}

export interface ZHANetworkBackupAndMetadata {
  backup: ZHANetworkBackup;
  is_complete: boolean;
}

export interface ZHAGroupMember {
  ieee: string;
  endpoint_id: string;
}

export const reconfigureNode = (
  hass: HomeAssistant,
  ieeeAddress: string,
  callbackFunction: (message: ClusterConfigurationEvent) => void
) =>
  hass.connection.subscribeMessage(
    (message: ClusterConfigurationEvent) => callbackFunction(message),
    {
      type: "zha/devices/reconfigure",
      ieee: ieeeAddress,
    }
  );

export const refreshTopology = (hass: HomeAssistant): Promise<void> =>
  hass.callWS({
    type: "zha/topology/update",
  });

export const fetchAttributesForCluster = (
  hass: HomeAssistant,
  ieeeAddress: string,
  endpointId: number,
  clusterId: number,
  clusterType: string
): Promise<Attribute[]> =>
  hass.callWS({
    type: "zha/devices/clusters/attributes",
    ieee: ieeeAddress,
    endpoint_id: endpointId,
    cluster_id: clusterId,
    cluster_type: clusterType,
  });

export const fetchDevices = (hass: HomeAssistant): Promise<ZHADevice[]> =>
  hass.callWS({
    type: "zha/devices",
  });

export const fetchZHADevice = (
  hass: HomeAssistant,
  ieeeAddress: string
): Promise<ZHADevice> =>
  hass.callWS({
    type: "zha/device",
    ieee: ieeeAddress,
  });

export const fetchBindableDevices = (
  hass: HomeAssistant,
  ieeeAddress: string
): Promise<ZHADevice[]> =>
  hass.callWS({
    type: "zha/devices/bindable",
    ieee: ieeeAddress,
  });

export const bindDevices = (
  hass: HomeAssistant,
  sourceIEEE: string,
  targetIEEE: string
): Promise<void> =>
  hass.callWS({
    type: "zha/devices/bind",
    source_ieee: sourceIEEE,
    target_ieee: targetIEEE,
  });

export const unbindDevices = (
  hass: HomeAssistant,
  sourceIEEE: string,
  targetIEEE: string
): Promise<void> =>
  hass.callWS({
    type: "zha/devices/unbind",
    source_ieee: sourceIEEE,
    target_ieee: targetIEEE,
  });

export const bindDeviceToGroup = (
  hass: HomeAssistant,
  deviceIEEE: string,
  groupId: number,
  clusters: Cluster[]
): Promise<void> =>
  hass.callWS({
    type: "zha/groups/bind",
    source_ieee: deviceIEEE,
    group_id: groupId,
    bindings: clusters,
  });

export const unbindDeviceFromGroup = (
  hass: HomeAssistant,
  deviceIEEE: string,
  groupId: number,
  clusters: Cluster[]
): Promise<void> =>
  hass.callWS({
    type: "zha/groups/unbind",
    source_ieee: deviceIEEE,
    group_id: groupId,
    bindings: clusters,
  });

export const readAttributeValue = (
  hass: HomeAssistant,
  data: ReadAttributeServiceData
): Promise<string> =>
  hass.callWS({
    ...data,
    type: "zha/devices/clusters/attributes/value",
  });

export const fetchCommandsForCluster = (
  hass: HomeAssistant,
  ieeeAddress: string,
  endpointId: number,
  clusterId: number,
  clusterType: string
): Promise<Command[]> =>
  hass.callWS({
    type: "zha/devices/clusters/commands",
    ieee: ieeeAddress,
    endpoint_id: endpointId,
    cluster_id: clusterId,
    cluster_type: clusterType,
  });

export const fetchClustersForZhaDevice = (
  hass: HomeAssistant,
  ieeeAddress: string
): Promise<Cluster[]> =>
  hass.callWS({
    type: "zha/devices/clusters",
    ieee: ieeeAddress,
  });

export const fetchGroups = (hass: HomeAssistant): Promise<ZHAGroup[]> =>
  hass.callWS({
    type: "zha/groups",
  });

export const removeGroups = (
  hass: HomeAssistant,
  groupIdsToRemove: number[]
): Promise<ZHAGroup[]> =>
  hass.callWS({
    type: "zha/group/remove",
    group_ids: groupIdsToRemove,
  });

export const fetchGroup = (
  hass: HomeAssistant,
  groupId: number
): Promise<ZHAGroup> =>
  hass.callWS({
    type: "zha/group",
    group_id: groupId,
  });

export const fetchGroupableDevices = (
  hass: HomeAssistant
): Promise<ZHADeviceEndpoint[]> =>
  hass.callWS({
    type: "zha/devices/groupable",
  });

export const addMembersToGroup = (
  hass: HomeAssistant,
  groupId: number,
  membersToAdd: ZHAGroupMember[]
): Promise<ZHAGroup> =>
  hass.callWS({
    type: "zha/group/members/add",
    group_id: groupId,
    members: membersToAdd,
  });

export const removeMembersFromGroup = (
  hass: HomeAssistant,
  groupId: number,
  membersToRemove: ZHAGroupMember[]
): Promise<ZHAGroup> =>
  hass.callWS({
    type: "zha/group/members/remove",
    group_id: groupId,
    members: membersToRemove,
  });

export const addGroup = (
  hass: HomeAssistant,
  groupName: string,
  membersToAdd?: ZHAGroupMember[]
): Promise<ZHAGroup> =>
  hass.callWS({
    type: "zha/group/add",
    group_name: groupName,
    members: membersToAdd,
  });

export const fetchZHAConfiguration = (
  hass: HomeAssistant
): Promise<ZHAConfiguration> =>
  hass.callWS({
    type: "zha/configuration",
  });

export const updateZHAConfiguration = (
  hass: HomeAssistant,
  data: any
): Promise<any> =>
  hass.callWS({
    type: "zha/configuration/update",
    data: data,
  });

export const fetchZHANetworkSettings = (
  hass: HomeAssistant
): Promise<ZHANetworkSettings> =>
  hass.callWS({
    type: "zha/network/settings",
  });

export const createZHANetworkBackup = (
  hass: HomeAssistant
): Promise<ZHANetworkBackupAndMetadata> =>
  hass.callWS({
    type: "zha/network/backups/create",
  });

export const restoreZHANetworkBackup = (
  hass: HomeAssistant,
  backup: ZHANetworkBackup,
  ezspForceWriteEUI64 = false
): Promise<void> =>
  hass.callWS({
    type: "zha/network/backups/restore",
    backup: backup,
    ezsp_force_write_eui64: ezspForceWriteEUI64,
  });

export const listZHANetworkBackups = (
  hass: HomeAssistant
): Promise<ZHANetworkBackup[]> =>
  hass.callWS({
    type: "zha/network/backups/list",
  });

export const changeZHANetworkChannel = (
  hass: HomeAssistant,
  newChannel: "auto" | number
): Promise<void> =>
  hass.callWS({
    type: "zha/network/change_channel",
    new_channel: newChannel,
  });

export const INITIALIZED = "INITIALIZED";
export const INTERVIEW_COMPLETE = "INTERVIEW_COMPLETE";
export const CONFIGURED = "CONFIGURED";
export const PAIRED = "PAIRED";
export const INCOMPLETE_PAIRING_STATUSES = [
  PAIRED,
  CONFIGURED,
  INTERVIEW_COMPLETE,
];

export const DEVICE_JOINED = "device_joined";
export const RAW_DEVICE_INITIALIZED = "raw_device_initialized";
export const DEVICE_FULLY_INITIALIZED = "device_fully_initialized";
export const DEVICE_MESSAGE_TYPES = [
  DEVICE_JOINED,
  RAW_DEVICE_INITIALIZED,
  DEVICE_FULLY_INITIALIZED,
];
export const LOG_OUTPUT = "log_output";
export const ZHA_CHANNEL_MSG = "zha_channel_message";
export const ZHA_CHANNEL_MSG_BIND = "zha_channel_bind";
export const ZHA_CHANNEL_MSG_CFG_RPT = "zha_channel_configure_reporting";
export const ZHA_CHANNEL_CFG_DONE = "zha_channel_cfg_done";
