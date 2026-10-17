import type { HassServiceTarget } from "home-assistant-js-websocket";
import { addRecent } from "../../../../common/array/add-recent";
import { ensureArray } from "../../../../common/array/ensure-array";
import { isValidEntityId } from "../../../../common/entity/valid_entity_id";
import { hasTemplate } from "../../../../common/string/has-template";
import { TARGET_SEPARATOR, type TargetType } from "../../../../data/target";

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

const targetIds = (target: HassServiceTarget | undefined): string[] =>
  RECENT_TARGET_TYPES.flatMap((type) =>
    (ensureArray(target?.[`${type}_id`]) ?? [])
      .filter(
        (id): id is string =>
          typeof id === "string" &&
          !!id &&
          !hasTemplate(id) &&
          // Device automations can reference an entity by its registry id,
          // and "all" or "none" are no entities
          (type !== "entity" || isValidEntityId(id))
      )
      .map((id) => `${type}${TARGET_SEPARATOR}${id}`)
  );

/**
 * The places a trigger, condition or action config holds targets: its
 * `target`, top level ids like those of entity and device pickers, and the
 * legacy service `data` ids.
 */
export const configTargets = (config: unknown): HassServiceTarget[] => {
  if (!config || typeof config !== "object") {
    return [];
  }
  const { target, data } = config as Record<string, unknown>;
  return [config, target, data].filter(
    (value): value is HassServiceTarget => !!value && typeof value === "object"
  );
};

/**
 * Add the targets that are in `newTargets` but in none of `oldTargets` to the
 * recent targets. Returns the given list unchanged when nothing was added.
 */
export const addRecentTargets = (
  recents: string[] | undefined,
  oldTargets: HassServiceTarget[],
  newTargets: HassServiceTarget[]
): string[] | undefined => {
  const oldIds = new Set(oldTargets.flatMap(targetIds));
  return [...new Set(newTargets.flatMap(targetIds))]
    .filter((id) => !oldIds.has(id))
    .reduce<string[] | undefined>(
      (list, id) =>
        addRecent(list, id, MAX_RECENT_TARGETS, (item) =>
          Boolean(parseRecentTarget(item))
        ),
      recents
    );
};
