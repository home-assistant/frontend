import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { HomeAssistant } from "../types";

interface GroupEntityAttributes extends HassEntityAttributeBase {
  entity_id: string[];
  order: number;
  auto?: boolean;
  view?: boolean;
  control?: "hidden";
}
export interface GroupEntity extends HassEntityBase {
  attributes: GroupEntityAttributes;
}

export const computeGroupDomain = (
  stateObj: GroupEntity
): string | undefined => {
  const entityIds = stateObj.attributes.entity_id || [];
  const uniqueDomains = [
    ...new Set(entityIds.map((entityId) => computeDomain(entityId))),
  ];
  return uniqueDomains.length === 1 ? uniqueDomains[0] : undefined;
};

export const previewGroupSensor = (
  hass: HomeAssistant,
  flow_id: string,
  flow_type: "config_flow" | "options_flow",
  user_input: Record<string, any>
): Promise<{ state: string; attributes: Record<string, any> }> =>
  hass.callWS({
    type: "group/sensor/preview",
    flow_id,
    flow_type,
    user_input,
  });
