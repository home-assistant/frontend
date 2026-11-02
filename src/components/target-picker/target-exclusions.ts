import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../../common/array/ensure-array";
import {
  extractFromTarget,
  type ExtractFromTargetResultReferenced,
  type HassServiceTargetWithExclude,
  type TargetItem,
  type TargetType,
} from "../../data/target";
import type { HomeAssistant } from "../../types";
import { computeTargetSubRows } from "./compute-target-sub-rows";

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
  /** It also takes entities out of another included target. */
  shared: boolean;
}

export interface TargetExclusions {
  /** Exclusions by the `type:id` of each included target they affect. */
  perTarget: Record<string, TargetExclusion[]>;
  /** Exclusions that take nothing out of any included target. */
  noEffect: TargetItem[];
  /** The entities of each included target, by its `type:id`. */
  included: Record<string, string[]>;
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
        shared: hits.length > 1,
      });
    });
  });

  const included = Object.fromEntries(
    includes.map((include) => [targetItemKey(include), include.entities])
  );
  return { perTarget, noEffect, included };
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

/** A row of the target details, with the rows shown under it. */
export interface TargetRow extends TargetItem {
  entities: string[];
  children: TargetRow[];
}

/**
 * The rows the target details show for an item, built the same way the rows
 * lay themselves out. Rows without entities aren't shown, so they are left
 * out.
 */
export const buildTargetRow = (
  type: TargetType,
  id: string,
  entries: ExtractFromTargetResultReferenced | undefined,
  entityRegistry: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): TargetRow => {
  if (type === "entity") {
    return { type, id, entities: [id], children: [] };
  }
  if (!entries) {
    return { type, id, entities: [], children: [] };
  }
  const sub = computeTargetSubRows(type, id, entries, entityRegistry, devices);
  const build = (
    rowType: TargetType,
    rowId: string,
    rowEntries?: ExtractFromTargetResultReferenced
  ) => buildTargetRow(rowType, rowId, rowEntries, entityRegistry, devices);
  const children = [
    ...sub.rows.map((rowId, index) =>
      build(sub.nextType, rowId, sub.rowEntries?.[index])
    ),
    ...sub.deviceRows.map((rowId, index) =>
      build("device", rowId, sub.deviceRowEntries?.[index])
    ),
    ...sub.entityRows.map((rowId) => build("entity", rowId)),
  ].filter((row) => row.entities.length > 0);
  return { type, id, entities: entries.referenced_entities, children };
};

const rowKeysBelow = (row: TargetRow, keys = new Set<string>()) => {
  row.children.forEach((child) => {
    keys.add(targetItemKey(child));
    rowKeysBelow(child, keys);
  });
  return keys;
};

/**
 * Whether a row's checkbox can take an exclusion away: the row's own one,
 * or one of a row below it. Labels have no row, an exclusion of something
 * above the row or outside the details isn't the row's to undo, and one that
 * also affects another target is only undone from its own row. The target
 * can't be excluded from itself, so it has no own exclusion.
 */
const canUndo = (row: TargetRow, isTarget: boolean) => {
  const rowKey = targetItemKey(row);
  let below: Set<string> | undefined;
  return (exclusion: TargetExclusion): boolean => {
    const key = targetItemKey(exclusion);
    if (key === rowKey) {
      return !isTarget;
    }
    if (exclusion.shared || exclusion.type === "label") {
      return false;
    }
    if (exclusion.type === "entity") {
      return row.entities.includes(exclusion.id);
    }
    below ??= rowKeysBelow(row);
    return below.has(key);
  };
};

const affects = (row: TargetRow) => {
  const entities = new Set(row.entities);
  return (exclusion: TargetExclusion) =>
    exclusion.removed.some((entityId) => entities.has(entityId));
};

export interface TargetRowState {
  checked: boolean;
  indeterminate: boolean;
  /** Everything in the row is out through exclusions it can't undo. */
  disabled: boolean;
  /** When disabled: the exclusions that keep it out. */
  lockedBy: TargetItem[];
}

/**
 * Whether an exclusion is of something below a row: one of the rows under it,
 * or one of its entities. Labels have no row, so they never are.
 */
const isBelow = (row: TargetRow) => {
  let below: Set<string> | undefined;
  return (exclusion: TargetExclusion): boolean => {
    if (exclusion.type === "entity") {
      return row.type !== "entity" && row.entities.includes(exclusion.id);
    }
    below ??= rowKeysBelow(row);
    return below.has(targetItemKey(exclusion));
  };
};

/**
 * How a row's checkbox shows `exclusions`. A row is only out as a whole when
 * it, or something above it, is excluded. When only what is below it is,
 * even all of it, the row is partly out.
 */
export const targetRowState = (
  row: TargetRow,
  isTarget: boolean,
  exclusions: TargetExclusion[]
): TargetRowState => {
  const entities = new Set(row.entities);
  const undoable = canUndo(row, isTarget);
  const fromBelow = isBelow(row);
  const out = new Set<string>();
  const wholeOut = new Set<string>();
  const undoableOut = new Set<string>();
  const locked = new Set<string>();
  const lockedBy: TargetItem[] = [];
  exclusions.forEach((exclusion) => {
    const removed = exclusion.removed.filter((entityId) =>
      entities.has(entityId)
    );
    if (!removed.length) {
      return;
    }
    removed.forEach((entityId) => out.add(entityId));
    if (!fromBelow(exclusion)) {
      removed.forEach((entityId) => wholeOut.add(entityId));
    }
    if (undoable(exclusion)) {
      removed.forEach((entityId) => undoableOut.add(entityId));
    } else {
      removed.forEach((entityId) => locked.add(entityId));
      lockedBy.push({ type: exclusion.type, id: exclusion.id });
    }
  });
  const disabled = entities.size > 0 && locked.size === entities.size;
  return {
    checked: !disabled && undoableOut.size === 0,
    indeterminate: out.size > 0 && wholeOut.size < entities.size,
    disabled,
    lockedBy: disabled ? lockedBy : [],
  };
};

/**
 * The exclusions after a row's checkbox was changed. Checking a row takes
 * away the exclusions it can undo; what others keep out stays out.
 * Unchecking it excludes the row itself, so an area or device stays
 * excluded as such, including what is added to it later. The target can't
 * be excluded from itself, so unchecking it unchecks its rows instead.
 * `initial` gives back an exclusion that was there before as it was. A new
 * one is shared when it takes out any of `otherTargetEntities`.
 */
export const toggleTargetRow = ({
  row,
  isTarget,
  selected,
  exclusions,
  initial,
  otherTargetEntities,
}: {
  row: TargetRow;
  isTarget: boolean;
  selected: boolean;
  exclusions: TargetExclusion[];
  initial: TargetExclusion[];
  otherTargetEntities?: ReadonlySet<string>;
}): TargetExclusion[] => {
  if (!selected && isTarget) {
    return row.children
      .filter((child) => !targetRowState(child, false, exclusions).disabled)
      .reduce(
        (result, child) =>
          toggleTargetRow({
            row: child,
            isTarget: false,
            selected: false,
            exclusions: result,
            initial,
            otherTargetEntities,
          }),
        exclusions
      );
  }
  const touches = affects(row);
  const undoable = canUndo(row, isTarget);
  const kept = exclusions.filter(
    (exclusion) => !(touches(exclusion) && undoable(exclusion))
  );
  if (selected) {
    return kept;
  }
  const key = targetItemKey(row);
  return [
    ...kept,
    initial.find((exclusion) => targetItemKey(exclusion) === key) ?? {
      type: row.type,
      id: row.id,
      removed: row.entities,
      shared: isShared(row.entities, otherTargetEntities),
    },
  ];
};

/** Whether an exclusion taking out `removed` also affects another target. */
export const isShared = (
  removed: string[],
  otherTargetEntities?: ReadonlySet<string>
): boolean =>
  !!otherTargetEntities &&
  removed.some((entityId) => otherTargetEntities.has(entityId));

/**
 * The new `exclude` once the details are applied: what was taken away is
 * removed, what was added is added, and everything else stays as it was.
 */
export const applyExclusionChanges = (
  exclude: HassServiceTarget | undefined,
  initial: TargetExclusion[],
  current: TargetExclusion[]
): HassServiceTarget | undefined => {
  const before = new Set(initial.map(targetItemKey));
  const after = new Set(current.map(targetItemKey));
  const withoutRemoved = initial
    .filter((exclusion) => !after.has(targetItemKey(exclusion)))
    .reduce<HassServiceTarget | undefined>(removeFromExclude, exclude);
  return current
    .filter((exclusion) => !before.has(targetItemKey(exclusion)))
    .reduce<HassServiceTarget | undefined>(addToExclude, withoutRemoved);
};
