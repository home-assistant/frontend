import { HomeAssistant } from "../types";
import { HassEntity } from "home-assistant-js-websocket";

export interface ZHADeviceEntity extends HassEntity {
  device_info?: {
    identifiers: any[];
  };
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
  type: string;
  entity_id: string;
  cluster_id: number;
  cluster_type: string;
  attribute: number;
  manufacturer: number;
}

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

export const computeReadAttributeServiceData = (
  entityId: string,
  clusterId: number,
  clusterType: string,
  attributeId: number,
  manufacturerCodeOverride: any,
  selectedEntity?: ZHADeviceEntity,
  selectedCluster?: Cluster,
  selectedNode?: HassEntity
): ReadAttributeServiceData | undefined => {
  if (!selectedEntity || !selectedCluster || !selectedNode) {
    return;
  } else {
    return {
      type: "zha/entities/clusters/attributes/value",
      entity_id: entityId,
      cluster_id: clusterId,
      cluster_type: clusterType,
      attribute: attributeId,
      manufacturer: manufacturerCodeOverride
        ? parseInt(manufacturerCodeOverride as string, 10)
        : selectedNode!.attributes.manufacturer_code,
    };
  }
};

export const readAttributeValue = (
  hass: HomeAssistant,
  data: ReadAttributeServiceData
): any => hass.callWS(data);

export const fetchCommandsForCluster = (
  hass: HomeAssistant,
  entityId: string,
  ieeeAddress: string,
  clusterId: number,
  clusterType: string
): Promise<Command[]> =>
  hass!.callWS({
    type: "zha/entities/clusters/commands",
    entity_id: entityId,
    ieee: ieeeAddress,
    cluster_id: clusterId,
    cluster_type: clusterType,
  });
