import { createContext } from "@lit/context";
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
import { isConfigObject } from "./ui-support";

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

// A block written as a single item, or a template condition written as a
// string, is its first row, see `configErrorPath`
const isSingleItem = (value: unknown): boolean =>
  typeof value === "string" || (isConfigObject(value) && !("0" in value));

const childAt = (value: unknown, segment: string | number): unknown => {
  if (segment === 0 && isSingleItem(value)) {
    return value;
  }
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return (value as Record<string | number, unknown>)[segment];
};

const BLOCK_KEYS = new Set([
  "triggers",
  "conditions",
  "actions",
  "sequence",
  "if",
  "then",
  "else",
  "choose",
  "default",
  "parallel",
  "while",
  "until",
  "and",
  "or",
  "not",
  "wait_for_trigger",
]);

/**
 * Core reports errors of a block written as a single item, like
 * `default: { delay: … }`, without a list index, but the editor shows the
 * item as the first row of the block.
 */
export const configErrorPath = (
  config: unknown,
  path: ConfigPath
): ConfigPath => {
  const result: ConfigPath = [];
  let value = config;
  for (const [index, segment] of path.entries()) {
    result.push(segment);
    value = childAt(value, segment);
    if (typeof segment !== "string") {
      continue;
    }
    if (BLOCK_KEYS.has(segment)) {
      if (
        (isConfigObject(value) && typeof path[index + 1] === "string") ||
        (typeof value === "string" && index === path.length - 1)
      ) {
        result.push(0);
      }
    } else if (segment !== "repeat") {
      // Keys inside fields like `data` are not blocks
      return [...result, ...path.slice(index + 1)];
    }
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

// Keys that hold rows. Others, like `data`, are fields of the row.
const isRowsKey = (key: string): boolean =>
  BLOCK_KEYS.has(key) || key === "repeat";

/**
 * Whether rows of `previous` may sit at other paths in `current`, so errors
 * at their paths can point at the wrong rows. An edit replaces one item per
 * list on its way down, a move, insert or delete changes more.
 */
export const rowPathsShifted = (
  previous: unknown,
  current: unknown
): boolean => {
  if (previous === current) {
    return false;
  }
  if (Array.isArray(previous) || Array.isArray(current)) {
    if (
      !Array.isArray(previous) ||
      !Array.isArray(current) ||
      previous.length !== current.length
    ) {
      return true;
    }
    const changed = previous.flatMap((item, index) =>
      item === current[index] ? [] : [index]
    );
    return (
      changed.length > 1 ||
      rowPathsShifted(previous[changed[0]], current[changed[0]])
    );
  }
  // New blocks don't move other rows, and a template condition written as a
  // string keeps its path when it becomes an object
  if (!isConfigObject(previous)) {
    return false;
  }
  if (!isConfigObject(current)) {
    return true;
  }
  // An edit changes one block on its way down, more blocks can swap rows,
  // like `then` and `else`
  const changed = Object.keys(previous).filter(
    (key) =>
      isRowsKey(key) &&
      previous[key] !== undefined &&
      previous[key] !== current[key]
  );
  return (
    changed.length > 1 ||
    (changed.length === 1 &&
      (current[changed[0]] === undefined ||
        rowPathsShifted(previous[changed[0]], current[changed[0]])))
  );
};

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
