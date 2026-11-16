import { createContext } from "@lit/context";
import { deepEqual } from "../../../../common/util/deep-equal";
import {
  stringifyPath,
  type ConfigPath,
} from "../../../../common/util/config-path";
import type { AutomationConfig } from "../../../../data/automation";

/** How a part of a config differs from the config it was based on. */
export type DiffMark = "added" | "changed" | "removed";

/** A value inside a row that differs, relative to the row's path. */
export interface FieldChange {
  path: ConfigPath;
  mark: DiffMark;
  oldValue?: unknown;
  newValue?: unknown;
}

/** The automation settings outside of triggers, conditions and actions. */
export const AUTOMATION_SETTING_KEYS = [
  "alias",
  "description",
  "mode",
  "max",
  "max_exceeded",
  "variables",
  "trigger_variables",
] as const;

export type AutomationSettingKey = (typeof AUTOMATION_SETTING_KEYS)[number];

export interface AutomationDiff {
  /** The config the AI changed. */
  before: AutomationConfig;
  /**
   * The new config with the removed rows put back where they were, so the
   * editor can show them. Only for showing, never for saving.
   */
  config: AutomationConfig;
  /** Marks of rows, keyed by their stringified path in `config`. */
  rows: Map<string, DiffMark>;
  /**
   * The old and new config of rows the AI added or changed, keyed by their
   * stringified path in `config`. The new config is without removed rows.
   */
  items: Map<string, RowChange>;
  /** Changed values of changed rows, keyed by the row's stringified path. */
  fields: Map<string, FieldChange[]>;
  settings: Partial<Record<AutomationSettingKey, DiffMark>>;
  hasChanges: boolean;
}

export interface RowChange {
  /** `null` for an added row. */
  before: unknown;
  after?: unknown;
}

export const automationDiffContext = createContext<AutomationDiff | undefined>(
  "automation-diff"
);

/** How the AI changed the row open in the sidebar, for its YAML editor. */
export const automationRowChangeContext = createContext<RowChange | undefined>(
  "automation-row-change"
);

/**
 * Keys whose lists hold rows of their own in the editor, like the actions of a
 * sequence. Every other value is a field of the row it is in.
 */
const ROW_LIST_KEYS = new Set([
  "triggers",
  "conditions",
  "actions",
  "sequence",
  "parallel",
  "if",
  "then",
  "else",
  "choose",
  "default",
  "wait_for_trigger",
]);

// Keys every kind of row can have, so they don't tell what kind of row it is
const COMMON_KEYS = new Set([
  "alias",
  "enabled",
  "continue_on_error",
  "id",
  "note",
  "metadata",
  "response_variable",
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toList = (value: unknown): unknown[] =>
  value === undefined || value === null
    ? []
    : Array.isArray(value)
      ? value
      : [value];

/** What kind of row an item is, e.g. a state trigger or a service action. */
const itemKind = (item: unknown): string => {
  if (!isPlainObject(item)) {
    return typeof item;
  }
  if ("trigger" in item) {
    return `trigger:${String(item.trigger)}`;
  }
  if ("condition" in item) {
    return `condition:${String(item.condition)}`;
  }
  // An action calling another service is still the same row
  if ("action" in item || "service" in item) {
    return "action";
  }
  return (
    Object.keys(item)
      .filter((key) => !COMMON_KEYS.has(key))
      .sort()[0] ?? "empty"
  );
};

/** Pairs of indexes of equal items, in order, from a longest common subsequence. */
const equalPairs = (
  before: unknown[],
  after: unknown[]
): [number, number][] => {
  const lengths: number[][] = Array.from({ length: before.length + 1 }, () =>
    new Array<number>(after.length + 1).fill(0)
  );
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lengths[i][j] = deepEqual(before[i], after[j])
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (deepEqual(before[i], after[j])) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
};

class DiffBuilder {
  public rows = new Map<string, DiffMark>();

  public items = new Map<string, RowChange>();

  public fields = new Map<string, FieldChange[]>();

  /** Diffs a list of rows and returns it with the removed rows put back. */
  public rowList(
    before: unknown[],
    after: unknown[],
    path: ConfigPath
  ): unknown[] {
    const merged: unknown[] = [];
    const add = (item: unknown, mark?: DiffMark) => {
      const key = stringifyPath([...path, merged.length]);
      if (mark) {
        this.rows.set(key, mark);
      }
      if (mark === "added") {
        this.items.set(key, { before: null, after: item });
      }
      merged.push(item);
    };

    // Rows between two equal ones that are of the same kind, in order, are
    // taken as changed. The others were removed or added, and removed rows
    // come before added ones.
    const segment = (oldItems: unknown[], newItems: unknown[]) => {
      const pairs: [number, number][] = [];
      let nextOld = 0;
      newItems.forEach((newItem, newIndex) => {
        const match = oldItems.findIndex(
          (oldItem, index) =>
            index >= nextOld && itemKind(oldItem) === itemKind(newItem)
        );
        if (match !== -1) {
          pairs.push([match, newIndex]);
          nextOld = match + 1;
        }
      });
      let oldIndex = 0;
      let newIndex = 0;
      for (const [oldMatch, newMatch] of pairs) {
        for (; oldIndex < oldMatch; oldIndex++) {
          add(oldItems[oldIndex], "removed");
        }
        for (; newIndex < newMatch; newIndex++) {
          add(newItems[newIndex], "added");
        }
        add(
          this._row(oldItems[oldMatch], newItems[newMatch], [
            ...path,
            merged.length,
          ])
        );
        oldIndex = oldMatch + 1;
        newIndex = newMatch + 1;
      }
      oldItems.slice(oldIndex).forEach((item) => add(item, "removed"));
      newItems.slice(newIndex).forEach((item) => add(item, "added"));
    };

    let oldStart = 0;
    let newStart = 0;
    for (const [oldIndex, newIndex] of equalPairs(before, after)) {
      segment(
        before.slice(oldStart, oldIndex),
        after.slice(newStart, newIndex)
      );
      add(after[newIndex]);
      oldStart = oldIndex + 1;
      newStart = newIndex + 1;
    }
    segment(before.slice(oldStart), after.slice(newStart));
    return merged;
  }

  /** Diffs two rows of the same kind and returns the new one to show. */
  private _row(before: unknown, after: unknown, path: ConfigPath): unknown {
    this.items.set(stringifyPath(path), { before, after });
    if (!isPlainObject(before) || !isPlainObject(after)) {
      this.rows.set(stringifyPath(path), "changed");
      this.fields.set(stringifyPath(path), [
        { path: [], mark: "changed", oldValue: before, newValue: after },
      ]);
      return after;
    }
    const changes: FieldChange[] = [];
    const merged = this._object(before, after, path, [], changes);
    if (changes.length) {
      this.rows.set(stringifyPath(path), "changed");
      this.fields.set(stringifyPath(path), changes);
    }
    return merged;
  }

  private _object(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    rowPath: ConfigPath,
    fieldPath: ConfigPath,
    changes: FieldChange[]
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...after };
    const keys = [
      ...Object.keys(after),
      ...Object.keys(before).filter((key) => !(key in after)),
    ];
    for (const key of keys) {
      const oldValue = before[key];
      const newValue = after[key];
      if (deepEqual(oldValue, newValue)) {
        continue;
      }
      const path = [...fieldPath, key];
      if (
        ROW_LIST_KEYS.has(key) &&
        [oldValue, newValue].every(
          (value) =>
            value === undefined ||
            isPlainObject(value) ||
            (Array.isArray(value) &&
              value.every(
                (item) => isPlainObject(item) || typeof item === "string"
              ))
        )
      ) {
        merged[key] = this.rowList(toList(oldValue), toList(newValue), [
          ...rowPath,
          ...path,
        ]);
      } else if (isPlainObject(oldValue) && isPlainObject(newValue)) {
        merged[key] = this._object(oldValue, newValue, rowPath, path, changes);
      } else {
        changes.push({
          path,
          mark:
            oldValue === undefined
              ? "added"
              : newValue === undefined
                ? "removed"
                : "changed",
          oldValue,
          newValue,
        });
      }
    }
    return merged;
  }
}

/**
 * Compares a new automation config with the one it was based on. Rows that
 * are in both but differ are changed, rows only in the new config are added
 * and rows only in the old one are removed.
 */
export const diffAutomationConfigs = (
  before: AutomationConfig,
  after: AutomationConfig
): AutomationDiff => {
  const builder = new DiffBuilder();
  const config = { ...after } as Record<string, unknown>;
  const oldConfig = before as unknown as Record<string, unknown>;

  for (const key of ["triggers", "conditions", "actions"]) {
    config[key] = builder.rowList(toList(oldConfig[key]), toList(config[key]), [
      key,
    ]);
  }

  const settings: AutomationDiff["settings"] = {};
  for (const key of AUTOMATION_SETTING_KEYS) {
    const oldValue = oldConfig[key];
    const newValue = config[key];
    // An empty description is no description
    if (deepEqual(oldValue || undefined, newValue || undefined)) {
      continue;
    }
    settings[key] = !oldValue ? "added" : !newValue ? "removed" : "changed";
  }

  return {
    before,
    config: config as unknown as AutomationConfig,
    rows: builder.rows,
    items: builder.items,
    fields: builder.fields,
    settings,
    hasChanges: builder.rows.size > 0 || Object.keys(settings).length > 0,
  };
};

/**
 * The mark of the row at `path`. Rows inside an added or removed row are
 * added or removed with it.
 */
export const diffMarkAt = (
  diff: AutomationDiff | undefined,
  path: ConfigPath
): DiffMark | undefined => {
  if (!diff || !path.length) {
    return undefined;
  }
  for (let length = 1; length < path.length; length++) {
    const mark = diff.rows.get(stringifyPath(path.slice(0, length)));
    if (mark === "added" || mark === "removed") {
      return mark;
    }
  }
  return diff.rows.get(stringifyPath(path));
};

/**
 * The old and new config of the row at `path`, if the AI added or changed it.
 * A row inside an added row is added with it, its new config is the one the
 * editor shows.
 */
export const diffRowChangeAt = (
  diff: AutomationDiff | undefined,
  path: ConfigPath
): RowChange | undefined => {
  if (!diff || !path.length) {
    return undefined;
  }
  const change = diff.items.get(stringifyPath(path));
  if (change) {
    return change;
  }
  return diffMarkAt(diff, path) === "added" ? { before: null } : undefined;
};
