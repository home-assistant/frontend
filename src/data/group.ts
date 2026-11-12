import type {
  HassEntities,
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
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

/** Member entity IDs of a group entity, or undefined if it is not a group. */
export const computeGroupMemberIds = (
  stateObj: HassEntity
): string[] | undefined => {
  const ids =
    stateObj.attributes.group_entities ?? stateObj.attributes.entity_id;
  return Array.isArray(ids) ? ids : undefined;
};

/**
 * Drops groups that have a member in `entityIds`. A group with no listed
 * member stays, so hiding its bulbs doesn't read "All off".
 */
export const filterGroupsWithListedMembers = (
  entityIds: string[],
  states: HassEntities
): string[] => {
  const listed = new Set(entityIds);
  return entityIds.filter((entityId) => {
    const stateObj = states[entityId];
    return !(
      stateObj &&
      computeGroupMemberIds(stateObj)?.some(
        (memberId) => memberId !== entityId && listed.has(memberId)
      )
    );
  });
};
