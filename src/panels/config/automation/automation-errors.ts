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

/** The config items that have an error, to recognize them after edits. */
export interface KnownErrorItems {
  paths: ConfigPath[];
  items: WeakSet<object>;
  contents: Set<string>;
}

export const knownErrorItems = (
  config: unknown,
  errors: ConfigValidationError[]
): KnownErrorItems => {
  const items = new WeakSet<object>();
  const contents = new Set<string>();
  const paths = errors.map((error) => {
    const path = errorItemPath(config, error.path);
    const item = valueAt(config, path);
    if (isConfigObject(item)) {
      items.add(item);
      contents.add(JSON.stringify(item));
    }
    return path;
  });
  return { paths, items, contents };
};

const walkConfigObjects = (
  value: unknown,
  path: ConfigPath,
  visit: (item: object, path: ConfigPath) => void
) => {
  if (typeof value !== "object" || value === null) {
    return;
  }
  visit(value, path);
  Object.entries(value).forEach(([key, child]) => {
    walkConfigObjects(
      child,
      [...path, Array.isArray(value) ? Number(key) : key],
      visit
    );
  });
};

/**
 * Follows known items through edits and moves: the item now at a known path
 * is known by identity too, and the path a known item moved to is added.
 * Adds to the identity set of `known` in place, as a WeakSet can't be copied.
 */
export const followKnownErrorItems = (
  known: KnownErrorItems,
  config: unknown
): KnownErrorItems => {
  known.paths.forEach((path) => {
    const item = valueAt(config, path);
    if (isConfigObject(item)) {
      known.items.add(item);
    }
  });
  const paths = [...known.paths];
  walkConfigObjects(config, [], (item, path) => {
    if (
      known.items.has(item) &&
      !paths.some((knownPath) => pathEquals(knownPath, path))
    ) {
      paths.push(path);
    }
  });
  return { ...known, paths };
};

/**
 * The errors on items that already had one. An item is found by its path, or
 * after a move by identity or, once the YAML is parsed again, by content.
 */
export const errorsOnKnownItems = (
  known: KnownErrorItems,
  config: unknown,
  errors: ConfigValidationError[]
): ConfigValidationError[] =>
  errors.filter((error) => {
    const path = errorItemPath(config, error.path);
    const item = valueAt(config, path);
    return (
      known.paths.some((knownPath) => pathEquals(knownPath, path)) ||
      (isConfigObject(item) &&
        (known.items.has(item) || known.contents.has(JSON.stringify(item))))
    );
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
