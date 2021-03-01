import { HassEntity } from "home-assistant-js-websocket";
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
  signature: any;
  neighbors: Neighbor[];
  pairing_status?: string;
}

export interface Neighbor {
  ieee: string;
  nwk: string;
  lqi: number;
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

export interface Command {
  name: string;
  id: number;
  type: string;
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

export interface ZHAGroupMember {
  ieee: string;
  endpoint_id: string;
}

export const reconfigureNode = (
  hass: HomeAssistant,
  ieeeAddress: string
): Promise<void> =>
  hass.callWS({
    type: "zha/devices/reconfigure",
    ieee: ieeeAddress,
  });

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
): Promise<string> => {
  return hass.callWS({
    ...data,
    type: "zha/devices/clusters/attributes/value",
  });
};

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

export const fetchClustersForZhaNode = (
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
