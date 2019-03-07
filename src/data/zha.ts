import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export interface ZHAEntityReference extends HassEntity {
  name: string;
}

export interface ZHADevice {
  name: string;
  ieee: string;
  manufacturer: string;
  model: string;
  quirk_applied: boolean;
  quirk_class: string;
  entities: ZHAEntityReference[];
  manufacturer_code: number;
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
  manufacturer: number;
}

export const reconfigureNode = (
  hass: HomeAssistant,
  ieeeAddress: string
): Promise<void> =>
  hass.callWS({
    type: "zha/devices/reconfigure",
    ieee: ieeeAddress,
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
