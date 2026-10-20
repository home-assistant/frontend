import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../../common/array/ensure-array";
import {
  extractFromTarget,
  type HassServiceTargetWithExclude,
  type TargetItem,
  type TargetType,
} from "../../data/target";
import type { HomeAssistant } from "../../types";

// Helpers for `target.exclude`. The target value is the only place
// exclusions live; everything here derives from it or returns a new one.

export const TARGET_TYPES: readonly TargetType[] = [
  "entity",
  "device",
  "area",
  "floor",
  "label",
];

export const targetItemKey = ({ type, id }: TargetItem): string =>
  `${type}:${id}`;

/** The items a target lists, without what its `exclude` lists. */
export const targetItems = (target?: HassServiceTarget): TargetItem[] =>
  TARGET_TYPES.flatMap((type) => {
    const ids = target?.[`${type}_id`];
    return ids ? ensureArray(ids).map((id) => ({ type, id: String(id) })) : [];
  });

export const hasIncludedTargets = (target?: HassServiceTarget): boolean =>
  targetItems(target).length > 0;

/** A target item with the entities it resolves to. */
export interface ResolvedTargetItem extends TargetItem {
  entities: string[];
}

/** The entities a single target item resolves to. */
export const resolveTargetItemEntities = async (
  hass: HomeAssistant,
  item: TargetItem,
  primaryEntitiesOnly?: boolean
): Promise<string[]> => {
  if (item.type === "entity") {
    return item.id === "all" ? Object.keys(hass.states) : [item.id];
  }
  return (
    await extractFromTarget(
      hass.callWS,
      { [`${item.type}_id`]: [item.id] },
      false,
      primaryEntitiesOnly
    )
  ).referenced_entities;
};

/** An exclusion as seen from one included target. */
export interface TargetExclusion extends TargetItem {
  /** Entities it takes out of that target. */
  removed: string[];
}

export interface TargetExclusions {
  /** Exclusions by the `type:id` of each included target they affect. */
  perTarget: Record<string, TargetExclusion[]>;
  /** Exclusions that take nothing out of any included target. */
  noEffect: TargetItem[];
}

/**
 * Which exclusions take what out of each included target. Excludes are
 * global, so one exclusion is listed under every target it affects; one that
 * affects none, including one whose item no longer exists, has no effect.
 */
export const computeExclusionsPerTarget = (
  includes: ResolvedTargetItem[],
  excludes: ResolvedTargetItem[]
): TargetExclusions => {
  const perTarget: Record<string, TargetExclusion[]> = {};
  const noEffect: TargetItem[] = [];

  excludes.forEach((exclude) => {
    const excluded = new Set(exclude.entities);
    const hits = includes
      .map((include) => ({
        include,
        removed: [...new Set(include.entities)].filter((entityId) =>
          excluded.has(entityId)
        ),
      }))
      .filter(({ removed }) => removed.length > 0);

    if (!hits.length) {
      noEffect.push({ type: exclude.type, id: exclude.id });
      return;
    }

    hits.forEach(({ include, removed }) => {
      const key = targetItemKey(include);
      if (!perTarget[key]) {
        perTarget[key] = [];
      }
      perTarget[key].push({
        type: exclude.type,
        id: exclude.id,
        removed,
      });
    });
  });

  return { perTarget, noEffect };
};

/** The exclusions that take entities out of one item of a target. */
export const resolveItemExclusions = async (
  hass: HomeAssistant,
  item: TargetItem,
  exclude: HassServiceTarget | undefined,
  primaryEntitiesOnly?: boolean
): Promise<TargetExclusion[]> => {
  const excludes = targetItems(exclude);
  if (!excludes.length) {
    return [];
  }
  // Like core, an exclude takes out every entity of an item, not only the
  // primary ones.
  const [entities, excludeEntities] = await Promise.all([
    resolveTargetItemEntities(hass, item, primaryEntitiesOnly),
    Promise.all(
      excludes.map((exclusion) =>
        resolveTargetItemEntities(hass, exclusion, false)
      )
    ),
  ]);
  return (
    computeExclusionsPerTarget(
      [{ ...item, entities }],
      excludes.map((exclusion, index) => ({
        ...exclusion,
        entities: excludeEntities[index],
      }))
    ).perTarget[targetItemKey(item)] ?? []
  );
};

/** `exclude` with `item` added, or unchanged if it is already in there. */
export const addToExclude = (
  exclude: HassServiceTarget | undefined,
  item: TargetItem
): HassServiceTarget => {
  const key = `${item.type}_id`;
  const ids = exclude?.[key] ? ensureArray(exclude[key]) : [];
  if (ids.includes(item.id)) {
    return exclude!;
  }
  return { ...exclude, [key]: [...ids, item.id] };
};

/**
 * `exclude` without `item`. Keys left empty are dropped, and so is the whole
 * exclude once nothing is left in it.
 */
export const removeFromExclude = (
  exclude: HassServiceTarget | undefined,
  item: TargetItem
): HassServiceTarget | undefined => {
  if (!exclude) {
    return undefined;
  }
  const key = `${item.type}_id`;
  const ids = exclude[key]
    ? ensureArray(exclude[key]).filter((id) => String(id) !== item.id)
    : [];
  const newExclude: HassServiceTarget = { ...exclude };
  if (ids.length) {
    newExclude[key] = ids;
  } else {
    delete newExclude[key];
  }
  return hasIncludedTargets(newExclude) ? newExclude : undefined;
};

/**
 * The target with `exclude` set, or without it when there is nothing to
 * exclude. An exclude on its own is not a target, so it is dropped once
 * nothing is included.
 */
export const withExclude = (
  value: HassServiceTargetWithExclude | undefined,
  exclude: HassServiceTarget | undefined
): HassServiceTargetWithExclude | undefined => {
  if (!value) {
    return undefined;
  }
  const { exclude: _oldExclude, ...rest } = value;
  if (!hasIncludedTargets(rest)) {
    return undefined;
  }
  return exclude && hasIncludedTargets(exclude) ? { ...rest, exclude } : rest;
};
