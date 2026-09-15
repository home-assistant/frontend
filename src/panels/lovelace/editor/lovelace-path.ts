import type { LovelaceConfig } from "../../../data/lovelace/config/types";

export type LovelacePath = (string | number)[];
export type LovelaceItemKind = "view" | "section" | "card" | "badge";
export type LovelacePathTarget = "item" | "list" | "slot" | "node";

const LIST_KEYS: Record<string, LovelaceItemKind> = {
  views: "view",
  sections: "section",
  cards: "card",
  badges: "badge",
};

const SLOT_KEYS: Record<string, LovelaceItemKind> = {
  card: "card",
};

export const stringifyPath = (path: LovelacePath): string => path.join("/");

export const parsePath = (path: string): LovelacePath =>
  path === ""
    ? []
    : path
        .split("/")
        .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));

export const pathEquals = (a: LovelacePath, b: LovelacePath): boolean =>
  a.length === b.length && a.every((segment, index) => segment === b[index]);

export const isAncestorPath = (
  ancestor: LovelacePath,
  path: LovelacePath
): boolean =>
  ancestor.length < path.length &&
  ancestor.every((segment, index) => segment === path[index]);

export const getParentPath = (path: LovelacePath): LovelacePath =>
  path.slice(0, -1);

export const getViewPath = (path: LovelacePath): LovelacePath =>
  path.slice(0, 2);

export const getPathTarget = (path: LovelacePath): LovelacePathTarget => {
  const last = path[path.length - 1];
  if (typeof last === "number") {
    return "item";
  }
  if (last in LIST_KEYS) {
    return "list";
  }
  if (last in SLOT_KEYS) {
    return "slot";
  }
  return "node";
};

// Temporary compatibility: custom view layouts still pass [view, card] or [view, section, card] index tuples
export const normalizeCardPath = (path: LovelacePath): LovelacePath => {
  if (path.length < 2 || path.some((segment) => typeof segment === "string")) {
    return path;
  }
  const [viewIndex, ...rest] = path;
  return rest.length === 1
    ? ["views", viewIndex, "cards", rest[0]]
    : ["views", viewIndex, "sections", rest[0], "cards", rest[1]];
};

export const getItemKind = (
  path: LovelacePath
): LovelaceItemKind | undefined => {
  for (let index = path.length - 1; index >= 0; index--) {
    const segment = path[index];
    if (typeof segment === "string") {
      return LIST_KEYS[segment] ?? SLOT_KEYS[segment];
    }
  }
  return undefined;
};

const isRecord = (node: unknown): node is Record<string, unknown> =>
  typeof node === "object" && node !== null && !Array.isArray(node);

const isStrategyNode = (node: unknown): boolean =>
  isRecord(node) && "strategy" in node;

const strategyError = (path: LovelacePath, depth: number): Error =>
  new Error(
    `Cannot edit inside a strategy: ${stringifyPath(path.slice(0, depth))}`
  );

const getChild = (node: unknown, segment: string | number): unknown => {
  if (Array.isArray(node)) {
    return typeof segment === "number" ? node[segment] : undefined;
  }
  if (isRecord(node) && typeof segment === "string") {
    return node[segment];
  }
  return undefined;
};

const readAtPath = (node: unknown, path: LovelacePath, depth = 0): unknown => {
  if (depth === path.length) {
    return node;
  }
  if (node === undefined) {
    return undefined;
  }
  if (isStrategyNode(node)) {
    throw strategyError(path, depth);
  }
  return readAtPath(getChild(node, path[depth]), path, depth + 1);
};

const updateAtPath = (
  node: unknown,
  path: LovelacePath,
  updater: (node: unknown) => unknown,
  depth = 0
): unknown => {
  if (depth === path.length) {
    return updater(node);
  }
  if (isStrategyNode(node)) {
    throw strategyError(path, depth);
  }
  const segment = path[depth];
  if (typeof segment === "number") {
    const items = Array.isArray(node) ? node.slice() : [];
    items[segment] = updateAtPath(items[segment], path, updater, depth + 1);
    return items;
  }
  const record = isRecord(node) ? node : {};
  return {
    ...record,
    [segment]: updateAtPath(record[segment], path, updater, depth + 1),
  };
};

const update = (
  config: LovelaceConfig,
  path: LovelacePath,
  updater: (node: unknown) => unknown
): LovelaceConfig => updateAtPath(config, path, updater) as LovelaceConfig;

export const getAtPath = <T = unknown>(
  config: LovelaceConfig,
  path: LovelacePath
): T | undefined => readAtPath(config, path) as T | undefined;

export const setAtPath = (
  config: LovelaceConfig,
  path: LovelacePath,
  value: unknown
): LovelaceConfig => update(config, path, () => value);

export const insertAtPath = (
  config: LovelaceConfig,
  path: LovelacePath,
  value: unknown
): LovelaceConfig => {
  const index = path[path.length - 1];
  if (typeof index !== "number") {
    return setAtPath(config, path, value);
  }
  return update(config, getParentPath(path), (node) => {
    const items = Array.isArray(node) ? node.slice() : [];
    items.splice(Math.max(0, Math.min(index, items.length)), 0, value);
    return items;
  });
};

export const appendAtPath = (
  config: LovelaceConfig,
  collectionPath: LovelacePath,
  value: unknown
): LovelaceConfig =>
  update(config, collectionPath, (node) =>
    Array.isArray(node) ? [...node, value] : [value]
  );

export const deleteAtPath = (
  config: LovelaceConfig,
  path: LovelacePath
): LovelaceConfig => {
  if (path.length === 0 || getAtPath(config, path) === undefined) {
    return config;
  }
  const key = path[path.length - 1];
  return update(config, getParentPath(path), (node) => {
    if (typeof key === "number") {
      return Array.isArray(node)
        ? node.filter((_item, index) => index !== key)
        : node;
    }
    if (!isRecord(node)) {
      return node;
    }
    const record = { ...node };
    delete record[key];
    return record;
  });
};

export const moveAtPath = (
  config: LovelaceConfig,
  from: LovelacePath,
  to: LovelacePath
): LovelaceConfig => {
  if (pathEquals(from, to)) {
    return config;
  }
  if (isAncestorPath(from, to)) {
    throw new Error(
      `Cannot move ${stringifyPath(from)} into itself: ${stringifyPath(to)}`
    );
  }
  const value = getAtPath(config, from);
  if (value === undefined) {
    throw new Error(`Nothing to move at ${stringifyPath(from)}`);
  }
  const deleted = deleteAtPath(config, from);
  const target = [...to];
  const sameList =
    to.length === from.length &&
    pathEquals(getParentPath(from), getParentPath(to));
  const shiftedIndex = from.length - 1;
  const fromIndex = from[shiftedIndex];
  const toIndex = to[shiftedIndex];
  if (
    !sameList &&
    to.length > from.length &&
    isAncestorPath(getParentPath(from), to) &&
    typeof toIndex === "number" &&
    typeof fromIndex === "number" &&
    toIndex > fromIndex
  ) {
    target[shiftedIndex] = toIndex - 1;
  }
  return insertAtPath(deleted, target, value);
};
