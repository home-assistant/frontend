import { createContext } from "@lit/context";
import { ensureArray } from "../../../common/array/ensure-array";
import type { LocalizeFunc } from "../../../common/translations/localize";
import {
  formatPath,
  pathEquals,
  pathStartsWith,
  type ConfigPath,
} from "../../../common/util/config-path";
import type { ConfigValidationError } from "../../../data/config";
import type {
  AutomationPathRow,
  AutomationRowRegistry,
} from "./automation-path";

/** The validation errors of the config being edited, paths from its root. */
export const automationErrorsContext =
  createContext<ConfigValidationError[]>("automation-errors");

export const NO_ERRORS: ConfigValidationError[] = [];

/**
 * The row an error belongs to: the deepest rendered row on its path. Rows
 * above it only contain the error, they are expanded to show it.
 */
export const errorOwner = (
  registry: AutomationRowRegistry,
  error: ConfigValidationError
): AutomationPathRow | undefined => {
  const rows = registry.rowsAlong(error.path);
  return rows[rows.length - 1];
};

export const ownedErrors = (
  registry: AutomationRowRegistry,
  errors: ConfigValidationError[],
  row: AutomationPathRow
): ConfigValidationError[] => {
  const owned = errors.filter((error) => errorOwner(registry, error) === row);
  return owned.length ? owned : NO_ERRORS;
};

export const fieldErrors = (
  errors: ConfigValidationError[],
  path: ConfigPath
): Record<string, string> => {
  const fields: Record<string, string> = {};
  errors.forEach((error) => {
    const field = errorField(error, path);
    if (field !== undefined && !(field in fields)) {
      fields[field] = error.message;
    }
  });
  return fields;
};

/** The field of the config at `path` an error is about, if any. */
export const errorField = (
  error: ConfigValidationError,
  path: ConfigPath
): string | undefined =>
  error.path.length > path.length && pathStartsWith(error.path, path)
    ? String(error.path[path.length])
    : undefined;

export const errorText = (
  error: ConfigValidationError,
  path: ConfigPath = []
): string => {
  const relative = pathStartsWith(error.path, path)
    ? error.path.slice(path.length)
    : error.path;
  return relative.length
    ? `${formatPath(relative)}: ${error.message}`
    : error.message;
};

export const errorsEqual = (
  a: ConfigValidationError[],
  b: ConfigValidationError[]
): boolean =>
  a.length === b.length &&
  a.every(
    (error, index) =>
      error.message === b[index].message &&
      error.code === b[index].code &&
      pathEquals(error.path, b[index].path)
  );

const TRIGGER_LIST_KEYS = ["triggers", "wait_for_trigger"];

const isTriggerSublist = (value: unknown): value is { triggers: unknown } =>
  typeof value === "object" &&
  value !== null &&
  Object.keys(value).length === 1 &&
  "triggers" in value;

// Core validates triggers after flattening `triggers:` sublists one level
// deep, so its trigger indexes count the triggers of the flat list.
const flatTriggerPaths = (triggers: unknown[]): ConfigPath[] =>
  triggers.flatMap((trigger, index) =>
    isTriggerSublist(trigger)
      ? (ensureArray(trigger.triggers) ?? []).map((_, subIndex) => [
          index,
          "triggers",
          subIndex,
        ])
      : [[index]]
  );

const isConfigObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const childAt = (value: unknown, segment: string | number): unknown =>
  typeof value === "object" && value !== null
    ? (value as Record<string | number, unknown>)[segment]
    : undefined;

const valueAt = (config: unknown, path: ConfigPath): unknown =>
  path.reduce<unknown>(childAt, config);

/** Maps an error path of core's validated config onto the edited config. */
export const configErrorPath = (
  config: unknown,
  path: ConfigPath
): ConfigPath => {
  const result: ConfigPath = [];
  let value = config;
  for (let index = 0; index < path.length; index++) {
    const segment = path[index];
    const parentKey = result[result.length - 1];
    // Core wraps each action of the `parallel` shorthand in a sequence
    if (
      segment === "sequence" &&
      path[index + 1] === 0 &&
      result[result.length - 2] === "parallel" &&
      isConfigObject(value) &&
      !("sequence" in value)
    ) {
      index++;
      continue;
    }
    const mapped =
      typeof segment === "number" &&
      Array.isArray(value) &&
      TRIGGER_LIST_KEYS.includes(parentKey as string)
        ? flatTriggerPaths(value)[segment]
        : undefined;
    (mapped ?? [segment]).forEach((part) => {
      result.push(part);
      value = childAt(value, part);
    });
  }
  return result;
};

export const mapErrorsToConfig = (
  config: unknown,
  errors: ConfigValidationError[]
): ConfigValidationError[] =>
  errors.map((error) => ({
    ...error,
    path: configErrorPath(config, error.path),
  }));

// Rows sit at list items that are objects, not at entries of value lists
// like `entity_id`
const errorItemPath = (config: unknown, path: ConfigPath): ConfigPath => {
  let value = config;
  let end = 0;
  path.forEach((segment, index) => {
    value = childAt(value, segment);
    if (typeof segment === "number" && isConfigObject(value)) {
      end = index + 1;
    }
  });
  return path.slice(0, end);
};

/** A config item with an error, to recognize it after edits. */
export interface KnownErrorItem {
  path: ConfigPath;
  item?: object;
  content?: string;
}

const knownItemAt = (config: unknown, path: ConfigPath): KnownErrorItem => {
  const item = valueAt(config, path);
  return isConfigObject(item)
    ? { path, item, content: JSON.stringify(item) }
    : { path };
};

export const knownErrorItems = (
  config: unknown,
  errors: ConfigValidationError[]
): KnownErrorItem[] => {
  const known: KnownErrorItem[] = [];
  errors.forEach((error) => {
    const path = errorItemPath(config, error.path);
    if (!known.some((entry) => pathEquals(entry.path, path))) {
      known.push(knownItemAt(config, path));
    }
  });
  return known;
};

interface ConfigItems {
  paths: Map<object, ConfigPath>;
  contents: Map<string, ConfigPath[]>;
}

// The list entries that are objects, the items rows show
const configItems = (config: unknown): ConfigItems => {
  const items: ConfigItems = { paths: new Map(), contents: new Map() };
  const walk = (value: unknown, path: ConfigPath) => {
    if (typeof value !== "object" || value === null) {
      return;
    }
    if (typeof path[path.length - 1] === "number" && isConfigObject(value)) {
      items.paths.set(value, path);
      const content = JSON.stringify(value);
      items.contents.set(content, [
        ...(items.contents.get(content) ?? []),
        path,
      ]);
    }
    Object.entries(value).forEach(([key, child]) => {
      walk(child, [...path, Array.isArray(value) ? Number(key) : key]);
    });
  };
  walk(config, []);
  return items;
};

const followItem = (
  entry: KnownErrorItem,
  previous: ConfigItems,
  current: ConfigItems,
  config: unknown
): KnownErrorItem | undefined => {
  // Unchanged or moved
  const path = entry.item && current.paths.get(entry.item);
  if (path) {
    return { ...entry, path };
  }
  // Moved after the YAML was parsed again
  const samePaths = entry.content
    ? current.contents.get(entry.content)
    : undefined;
  if (samePaths?.length === 1) {
    return knownItemAt(config, samePaths[0]);
  }
  // Identical items, e.g. two copies of a row, keep their place
  if (samePaths?.some((other) => pathEquals(other, entry.path))) {
    return knownItemAt(config, entry.path);
  }
  const now = valueAt(config, entry.path);
  if (!isConfigObject(now)) {
    return undefined;
  }
  // An item that was already there took the place, e.g. after a delete
  const beforePaths = previous.paths.has(now)
    ? [previous.paths.get(now)!]
    : (previous.contents.get(JSON.stringify(now)) ?? []);
  if (
    beforePaths.length &&
    !beforePaths.some((other) => pathEquals(other, entry.path))
  ) {
    return undefined;
  }
  // Edited in place
  return knownItemAt(config, entry.path);
};

/** Follows known items from `previous` to `config` through moves and edits. */
export const followKnownErrorItems = (
  known: KnownErrorItem[],
  previous: unknown,
  config: unknown
): KnownErrorItem[] => {
  const previousItems = configItems(previous);
  const currentItems = configItems(config);
  return known
    .map((entry) => followItem(entry, previousItems, currentItems, config))
    .filter((entry): entry is KnownErrorItem => entry !== undefined);
};

/**
 * Moves errors of `previous` to where their items are in `config`. Errors of
 * items that are gone are dropped.
 */
export const followErrors = (
  errors: ConfigValidationError[],
  previous: unknown,
  config: unknown
): ConfigValidationError[] => {
  const previousItems = configItems(previous);
  const currentItems = configItems(config);
  return errors.flatMap((error) => {
    const path = errorItemPath(previous, error.path);
    const moved = followItem(
      knownItemAt(previous, path),
      previousItems,
      currentItems,
      config
    );
    return moved
      ? [{ ...error, path: [...moved.path, ...error.path.slice(path.length)] }]
      : [];
  });
};

/** The errors on items that already had one. */
export const errorsOnKnownItems = (
  known: KnownErrorItem[],
  config: unknown,
  errors: ConfigValidationError[]
): ConfigValidationError[] =>
  errors.filter((error) => {
    const path = errorItemPath(config, error.path);
    return known.some((entry) => pathEquals(entry.path, path));
  });

export const targetErrorText = (
  localize: LocalizeFunc,
  error: ConfigValidationError
): string =>
  localize(
    error.code === "required"
      ? "ui.panel.config.automation.editor.errors.target_required"
      : "ui.panel.config.automation.editor.errors.target_invalid"
  );

export const deviceErrorText = (
  localize: LocalizeFunc,
  error: ConfigValidationError
): string =>
  error.code === "required"
    ? localize("ui.panel.config.automation.editor.errors.device_required")
    : error.message;

export const deviceAutomationErrorText = (
  localize: LocalizeFunc,
  kind: "triggers" | "conditions" | "actions",
  error: ConfigValidationError
): string =>
  error.code === "required"
    ? localize(`ui.panel.config.devices.automation.${kind}.required`)
    : error.message;
