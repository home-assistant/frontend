import { deepEqual } from "./deep-equal";
import {
  getAtPath,
  pathStartsWith,
  setAtPath,
  type ConfigPath,
} from "./config-path";

/**
 * One edit of a config as plain JSON, so it can be stored for undo, shown as
 * a diff or proposed by someone else and applied later.
 *
 * Like JSON Patch, `add` and `remove` work on object keys and list items: in a
 * list, `add` inserts at the index that ends `path` and later items shift.
 * `remove` and `replace` keep the old value, so they can be inverted and
 * checked against the config they are applied to. `move` removes the item at
 * `from`, then adds it at `path`.
 *
 * Changes apply in order, each to the config the previous ones left.
 */
export type ConfigChange =
  | { op: "add"; path: ConfigPath; value: unknown }
  | { op: "remove"; path: ConfigPath; value: unknown }
  | { op: "replace"; path: ConfigPath; before: unknown; after: unknown }
  | { op: "move"; from: ConfigPath; path: ConfigPath };

// Key order counts, as the editors compare configs with it
const equal = (a: unknown, b: unknown) =>
  deepEqual(a, b, { compareKeyOrder: true });

const isContainer = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

/** Whether removing and appending keys turns `from` into `to`. */
const keepsKeyOrder = (from: string[], to: string[]) => {
  const kept = from.filter((key) => to.includes(key));
  return [...kept, ...to.filter((key) => !from.includes(key))].every(
    (key, index) => key === to[index]
  );
};

const itemsEqual = (
  a: unknown[],
  aStart: number,
  b: unknown[],
  bStart: number,
  count: number
) => {
  for (let i = 0; i < count; i++) {
    if (!equal(a[aStart + i], b[bStart + i])) {
      return false;
    }
  }
  return true;
};

const diffLists = (
  before: unknown[],
  after: unknown[],
  path: ConfigPath,
  changes: ConfigChange[]
) => {
  const length = Math.min(before.length, after.length);
  let first = 0;
  while (first < length && equal(before[first], after[first])) {
    first++;
  }
  if (first === length && before.length === after.length) {
    return;
  }
  if (
    after.length === before.length + 1 &&
    itemsEqual(before, first, after, first + 1, before.length - first)
  ) {
    changes.push({ op: "add", path: [...path, first], value: after[first] });
    return;
  }
  if (
    before.length === after.length + 1 &&
    itemsEqual(before, first + 1, after, first, after.length - first)
  ) {
    changes.push({
      op: "remove",
      path: [...path, first],
      value: before[first],
    });
    return;
  }
  if (Math.abs(before.length - after.length) === 1) {
    diffListsWithOneMore(before, after, path, changes);
    return;
  }
  if (before.length !== after.length) {
    changes.push({ op: "replace", path, before, after });
    return;
  }
  let last = before.length - 1;
  while (equal(before[last], after[last])) {
    last--;
  }
  const count = last - first;
  // A move shifts the items between its old and new index by one
  if (
    count > 0 &&
    equal(after[last], before[first]) &&
    itemsEqual(before, first + 1, after, first, count)
  ) {
    changes.push({ op: "move", from: [...path, first], path: [...path, last] });
    return;
  }
  if (
    count > 0 &&
    equal(after[first], before[last]) &&
    itemsEqual(before, first, after, first + 1, count)
  ) {
    changes.push({ op: "move", from: [...path, last], path: [...path, first] });
    return;
  }
  for (let index = first; index <= last; index++) {
    diffValues(before[index], after[index], [...path, index], changes);
  }
};

const sameKind = (a: unknown, b: unknown) =>
  isContainer(a) &&
  isContainer(b) &&
  Object.keys(a).sort().join() === Object.keys(b).sort().join();

/**
 * One item was added or removed and others changed, as when a row is dragged
 * into a block in the same list. The added or removed item is the one that
 * leaves the fewest other items changed, and of those the fewest changed
 * into another kind of item.
 */
const diffListsWithOneMore = (
  before: unknown[],
  after: unknown[],
  path: ConfigPath,
  changes: ConfigChange[]
) => {
  const added = after.length > before.length;
  const longer = added ? after : before;
  const shorter = added ? before : after;
  let index = 0;
  let fewest = Infinity;
  for (let candidate = 0; candidate < longer.length; candidate++) {
    let score = 0;
    shorter.forEach((item, i) => {
      const counterpart = longer[i < candidate ? i : i + 1];
      if (!equal(counterpart, item)) {
        score += sameKind(counterpart, item) ? 2 : 3;
      }
    });
    if (score < fewest) {
      index = candidate;
      fewest = score;
    }
  }
  changes.push(
    added
      ? { op: "add", path: [...path, index], value: after[index] }
      : { op: "remove", path: [...path, index], value: before[index] }
  );
  // Compared at the indices of `after`, where they are after the first change
  after.forEach((item, i) => {
    if (added && i === index) {
      return;
    }
    const counterpart = added
      ? before[i < index ? i : i - 1]
      : before[i < index ? i : i + 1];
    diffValues(counterpart, item, [...path, i], changes);
  });
};

const diffValues = (
  before: unknown,
  after: unknown,
  path: ConfigPath,
  changes: ConfigChange[]
) => {
  if (before === after) {
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    diffLists(before, after, path, changes);
    return;
  }
  if (
    isContainer(before) &&
    isContainer(after) &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  ) {
    const beforeKeys = Object.keys(before);
    const afterKeys = Object.keys(after);
    // Applying a change adds a key at the end, and undo adds removed keys
    // back in reverse order. Where that would change the key order, the whole
    // object is replaced instead.
    const keysChanged =
      afterKeys.filter((key) => !beforeKeys.includes(key)).length +
      beforeKeys.filter((key) => !afterKeys.includes(key)).length;
    // A key holding undefined is no change as a value, but the dirty check
    // compares keys
    const undefinedKeyChanged = [...beforeKeys, ...afterKeys].some(
      (key) =>
        key in before !== key in after &&
        (before as Record<string, unknown>)[key] === undefined &&
        (after as Record<string, unknown>)[key] === undefined
    );
    if (
      keysChanged > 1 ||
      undefinedKeyChanged ||
      !keepsKeyOrder(beforeKeys, afterKeys) ||
      !keepsKeyOrder(afterKeys, beforeKeys)
    ) {
      changes.push({ op: "replace", path, before, after });
      return;
    }
    for (const key of new Set([...beforeKeys, ...afterKeys])) {
      diffValues(
        (before as Record<string, unknown>)[key],
        (after as Record<string, unknown>)[key],
        [...path, key],
        changes
      );
    }
    return;
  }
  if (before === undefined) {
    changes.push({ op: "add", path, value: after });
  } else if (after === undefined) {
    changes.push({ op: "remove", path, value: before });
  } else if (!equal(before, after)) {
    changes.push({ op: "replace", path, before, after });
  }
};

/**
 * The changes that turn `before` into `after`, each as small as possible.
 * An insertion, removal or move of a single list item is found as such; other
 * list changes are compared item by item, or replace the list.
 */
export const diffConfigs = (
  before: unknown,
  after: unknown
): ConfigChange[] => {
  const changes: ConfigChange[] = [];
  diffValues(before, after, [], changes);
  return changes;
};

const isListItem = (root: unknown, path: ConfigPath) =>
  Array.isArray(getAtPath(root, path.slice(0, -1)));

const updateList = <T>(
  root: T,
  path: ConfigPath,
  update: (list: unknown[], index: number) => unknown[],
  onCopy?: (original: object, copy: object) => void
): T => {
  const listPath = path.slice(0, -1);
  const list = getAtPath(root, listPath) as unknown[];
  const updated = update(list, path[path.length - 1] as number);
  onCopy?.(list, updated);
  return setAtPath(root, listPath, updated, onCopy);
};

const add = <T>(
  root: T,
  path: ConfigPath,
  value: unknown,
  onCopy?: (original: object, copy: object) => void
) =>
  isListItem(root, path)
    ? updateList(
        root,
        path,
        (list, index) => [...list.slice(0, index), value, ...list.slice(index)],
        onCopy
      )
    : setAtPath(root, path, value, onCopy);

const remove = <T>(
  root: T,
  path: ConfigPath,
  onCopy?: (original: object, copy: object) => void
) =>
  isListItem(root, path)
    ? updateList(
        root,
        path,
        (list, index) => list.filter((_item, i) => i !== index),
        onCopy
      )
    : setAtPath(root, path, undefined, onCopy);

/**
 * Applies changes immutably. `onCopy` sees every copied container next to its
 * original.
 */
export const applyConfigChanges = <T>(
  root: T,
  changes: ConfigChange[],
  onCopy?: (original: object, copy: object) => void
): T =>
  changes.reduce((config, change) => {
    switch (change.op) {
      case "add":
        return add(config, change.path, change.value, onCopy);
      case "remove":
        return remove(config, change.path, onCopy);
      case "replace":
        return setAtPath(config, change.path, change.after, onCopy);
      case "move":
        return add(
          remove(config, change.from, onCopy),
          change.path,
          getAtPath(config, change.from),
          onCopy
        );
    }
    return config;
  }, root);

/** The changes that undo `changes`. */
export const invertConfigChanges = (changes: ConfigChange[]): ConfigChange[] =>
  changes
    .map((change): ConfigChange => {
      switch (change.op) {
        case "add":
          return { op: "remove", path: change.path, value: change.value };
        case "remove":
          return { op: "add", path: change.path, value: change.value };
        case "replace":
          return {
            op: "replace",
            path: change.path,
            before: change.after,
            after: change.before,
          };
        case "move":
          return { op: "move", from: change.path, path: change.from };
      }
      return change;
    })
    .reverse();

// Moves `path` along when an item is added to or removed from a list above it
const shift = (
  path: ConfigPath,
  itemPath: ConfigPath,
  by: 1 | -1
): ConfigPath => {
  const listPath = itemPath.slice(0, -1);
  const index = itemPath[itemPath.length - 1];
  const segment = path[listPath.length];
  if (
    typeof index !== "number" ||
    typeof segment !== "number" ||
    path.length <= listPath.length ||
    !pathStartsWith(path, listPath) ||
    (by === 1 ? segment < index : segment <= index)
  ) {
    return path;
  }
  return [...listPath, segment + by, ...path.slice(listPath.length + 1)];
};

/**
 * Where the value at `path` is after `changes`, or `undefined` when it was
 * removed or is part of a replaced value.
 */
export const mapConfigPath = (
  path: ConfigPath,
  changes: ConfigChange[]
): ConfigPath | undefined => {
  let mapped: ConfigPath | undefined = path;
  for (const change of changes) {
    if (!mapped) {
      return undefined;
    }
    switch (change.op) {
      case "add":
        mapped = shift(mapped, change.path, 1);
        break;
      case "remove":
        mapped = pathStartsWith(mapped, change.path)
          ? undefined
          : shift(mapped, change.path, -1);
        break;
      case "replace":
        if (
          pathStartsWith(mapped, change.path) &&
          mapped.length > change.path.length
        ) {
          mapped = undefined;
        }
        break;
      case "move":
        mapped = pathStartsWith(mapped, change.from)
          ? [...change.path, ...mapped.slice(change.from.length)]
          : shift(shift(mapped, change.from, -1), change.path, 1);
        break;
    }
  }
  return mapped;
};
