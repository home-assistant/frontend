import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export interface ZHADeviceEntity extends HassEntity {
  device_info?: {
    identifiers: any[];
  };
}

export interface ZHAEntities {
  [key: string]: HassEntity[];
}

export interface Attribute {
  name: string;
  id: number;
}

export interface Cluster {
  name: string;
  id: number;
  type: string;
}

export interface Command {
  name: string;
  id: number;
  type: string;
}

export interface ReadAttributeServiceData {
  entity_id: string;
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
    type: "zha/nodes/reconfigure",
    ieee: ieeeAddress,
  });

export const fetchAttributesForCluster = (
  hass: HomeAssistant,
  entityId: string,
  ieeeAddress: string,
  clusterId: number,
  clusterType: string
): Promise<Attribute[]> =>
  hass.callWS({
    type: "zha/entities/clusters/attributes",
    entity_id: entityId,
    ieee: ieeeAddress,
    cluster_id: clusterId,
    cluster_type: clusterType,
  });

export const readAttributeValue = (
  hass: HomeAssistant,
  data: ReadAttributeServiceData
): Promise<string> => {
  return hass.callWS({
    ...data,
    type: "zha/entities/clusters/attributes/value",
  });
};

export const fetchCommandsForCluster = (
  hass: HomeAssistant,
  entityId: string,
  ieeeAddress: string,
  clusterId: number,
  clusterType: string
): Promise<Command[]> =>
  hass.callWS({
    type: "zha/entities/clusters/commands",
    entity_id: entityId,
    ieee: ieeeAddress,
    cluster_id: clusterId,
    cluster_type: clusterType,
  });

export const fetchClustersForZhaNode = (
  hass: HomeAssistant,
  entityId: string,
  ieeeAddress: string
): Promise<Cluster[]> =>
  hass.callWS({
    type: "zha/entities/clusters",
    entity_id: entityId,
    ieee: ieeeAddress,
  });

export const fetchEntitiesForZhaNode = (
  hass: HomeAssistant
): Promise<ZHAEntities> =>
  hass.callWS({
    type: "zha/entities",
  });
