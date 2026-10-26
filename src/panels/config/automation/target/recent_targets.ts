import { addRecent } from "../../../../common/array/add-recent";
import {
  TARGET_SEPARATOR,
  type SingleHassServiceTarget,
  type TargetType,
} from "../../../../data/target";

export const RECENT_TARGETS_STORAGE_KEY = "automation-recent-targets";

export const MAX_RECENT_TARGETS = 4;

const RECENT_TARGET_TYPES: readonly TargetType[] = [
  "floor",
  "area",
  "device",
  "entity",
  "label",
];

/**
 * Parse a stored "<type>________<id>" recent target, rejecting malformed
 * entries and structural buckets like unassigned devices.
 */
export const parseRecentTarget = (
  value: unknown
): [TargetType, string] | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const [type, id] = value.split(TARGET_SEPARATOR, 2);
  if (!id || !RECENT_TARGET_TYPES.includes(type as TargetType)) {
    return undefined;
  }
  return [type as TargetType, id];
};

/**
 * Add a target picked in the add automation element dialog to the recent
 * targets.
 */
export const addRecentTarget = (
  recents: string[] | undefined,
  target: SingleHassServiceTarget
): string[] | undefined =>
  RECENT_TARGET_TYPES.flatMap((type) => {
    const id = target[`${type}_id`];
    return id ? [`${type}${TARGET_SEPARATOR}${id}`] : [];
  }).reduce<string[] | undefined>(
    (list, id) =>
      addRecent(list, id, MAX_RECENT_TARGETS, (item) =>
        Boolean(parseRecentTarget(item))
      ),
    recents
  );
