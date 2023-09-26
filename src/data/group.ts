import {
  HassEntityAttributeBase,
  HassEntityBase,
  UnsubscribeFunc,
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

export interface GroupPreview {
  state: string;
  attributes: Record<string, any>;
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

export const subscribePreviewGroup = (
  hass: HomeAssistant,
  flow_id: string,
  flow_type: "config_flow" | "options_flow",
  user_input: Record<string, any>,
  callback: (preview: GroupPreview) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(callback, {
    type: "group/start_preview",
    flow_id,
    flow_type,
    user_input,
  });
