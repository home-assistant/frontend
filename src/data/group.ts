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

/**
 * Member entity IDs of a group entity, or undefined if it is not a group.
 * Core exposes them as `group_entities`; group helpers and integrations
 * like Hue (rooms and zones) use `entity_id`.
 */
export const computeGroupMemberIds = (
  stateObj: HassEntity
): string[] | undefined => {
  const { group_entities, entity_id } = stateObj.attributes;
  if (Array.isArray(group_entities)) {
    return group_entities;
  }
  return Array.isArray(entity_id) ? entity_id : undefined;
};

/**
 * Drops groups that have a member in `entityIds`, so counting the result
 * doesn't count a light twice. A group without any listed member (e.g. its
 * members are hidden) stays, as it is the only entity for those devices.
 */
export const filterGroupsWithListedMembers = (
  entityIds: string[],
  states: HassEntities
): string[] => {
  const listed = new Set(entityIds);
  return entityIds.filter((entityId) => {
    const stateObj = states[entityId];
    const members = stateObj ? computeGroupMemberIds(stateObj) : undefined;
    return !members?.some(
      (memberId) => memberId !== entityId && listed.has(memberId)
    );
  });
};
