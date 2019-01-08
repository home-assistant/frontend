import { HomeAssistant } from "../types";

export interface Attribute {
  name: string;
  id: number;
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
