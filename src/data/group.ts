import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import type { CallWS } from "../types";
import { computeDomain } from "../common/entity/compute_domain";

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

export interface GroupForEntity {
  entry_id: string;
  entity_id: string | null;
  name: string;
}

export interface GroupsForEntityResponse {
  group_type: string | null;
  groups: GroupForEntity[];
}

export const fetchGroupsForEntity = (
  callWS: CallWS,
  entityId: string
): Promise<GroupsForEntityResponse> =>
  callWS({
    type: "group/groups_for_entity",
    entity_id: entityId,
  });

export const addEntityToGroup = (
  callWS: CallWS,
  entryId: string,
  entityId: string
): Promise<{ entities: string[] }> =>
  callWS({
    type: "group/add_entity",
    entry_id: entryId,
    entity_id: entityId,
  });
