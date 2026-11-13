import type {
  HassEntities,
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import type { ExtEntityRegistryEntry } from "./entity/entity_registry";

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

/** Member entity IDs of a group, or undefined if it is not a group. */
export const computeGroupMemberIds = (
  stateObj: HassEntity,
  entry?: Pick<ExtEntityRegistryEntry, "capabilities"> | null
): string[] | undefined => {
  const ids =
    entry?.capabilities?.group_entities ??
    stateObj.attributes.group_entities ??
    stateObj.attributes.entity_id;
  return Array.isArray(ids) ? ids : undefined;
};

/**
 * Drops groups that have a member in `entityIds`, at any depth (a hidden
 * group in between still counts). A group with no listed member stays, so
 * hiding its bulbs doesn't read "All off".
 */
export const filterGroupsWithListedMembers = (
  entityIds: string[],
  states: HassEntities
): string[] => {
  const listed = new Set(entityIds);
  const hasListedDescendant = (groupId: string): boolean => {
    const seen = new Set([groupId]);
    const queue = [groupId];
    while (queue.length) {
      const stateObj = states[queue.shift()!];
      for (const memberId of (stateObj && computeGroupMemberIds(stateObj)) ??
        []) {
        if (seen.has(memberId)) {
          continue;
        }
        if (listed.has(memberId)) {
          return true;
        }
        seen.add(memberId);
        queue.push(memberId);
      }
    }
    return false;
  };
  return entityIds.filter((entityId) => {
    if (!hasListedDescendant(entityId)) {
      return true;
    }
    // A dropped group no longer counts as listed, so of two groups that
    // contain each other one still stays.
    listed.delete(entityId);
    return false;
  });
};
