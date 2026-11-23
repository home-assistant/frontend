import type { HassEntities, HassServices } from "home-assistant-js-websocket";
import { formatDurationLong } from "../../../../common/datetime/format_duration";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaDurationData } from "../../../../components/ha-duration-input";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { FrontendLocaleData } from "../../../../data/translation";
import type { HomeAssistant } from "../../../../types";
import type { DiffMark, FieldChange } from "./automation-ai-diff";

/** A change of a field, in the words of the editor. */
export interface ChangeLine {
  label: string;
  mark: DiffMark;
  oldValue?: string;
  newValue?: string;
}

/** What turns ids and keys into names, all optional but `localize`. */
export interface ChangeTextSources {
  localize: LocalizeFunc;
  locale?: FrontendLocaleData;
  states?: HassEntities;
  services?: HassServices;
  devices?: HomeAssistant["devices"];
  areas?: HomeAssistant["areas"];
  floors?: HomeAssistant["floors"];
  labels?: LabelRegistryEntry[];
}

type LocalizeKey = Parameters<LocalizeFunc>[0];

const TARGET_LABELS: Record<string, LocalizeKey> = {
  entity_id: "ui.components.target-picker.type.entities",
  device_id: "ui.components.target-picker.type.devices",
  area_id: "ui.components.target-picker.type.areas",
  floor_id: "ui.panel.config.automation.editor.target_summary.types.floor",
  label_id: "ui.components.target-picker.type.labels",
};

const DURATION_KEYS = new Set([
  "days",
  "hours",
  "minutes",
  "seconds",
  "milliseconds",
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDuration = (value: unknown): value is HaDurationData =>
  isPlainObject(value) &&
  Object.keys(value).length > 0 &&
  Object.entries(value).every(
    ([key, item]) => DURATION_KEYS.has(key) && typeof item === "number"
  );

/** `brightness_pct` becomes `Brightness pct`, for keys without a name. */
export const humanizeKey = (key: string): string => {
  const words = key.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// The parts of a row that name what its fields mean
interface RowKind {
  trigger?: string;
  condition?: string;
  domain?: string;
  service?: string;
}

const rowKind = (row: unknown): RowKind => {
  if (!isPlainObject(row)) {
    return {};
  }
  const kind: RowKind = {};
  if (typeof row.trigger === "string") {
    kind.trigger = row.trigger;
  }
  if (typeof row.condition === "string") {
    kind.condition = row.condition;
  }
  const action = row.action ?? row.service;
  if (typeof action === "string" && action.includes(".")) {
    [kind.domain, kind.service] = action.split(".", 2);
  }
  return kind;
};

// Localizes a key that may not exist, which gives an empty string
const tryLocalize = (sources: ChangeTextSources, key: string) =>
  sources.localize(key as LocalizeKey) || undefined;

const fieldLabel = (
  path: (string | number)[],
  kind: RowKind,
  sources: ChangeTextSources
): string => {
  const keys = path.filter((part): part is string => typeof part === "string");
  const key = keys[keys.length - 1];
  if (!key) {
    return "";
  }
  if (key in TARGET_LABELS) {
    return sources.localize(TARGET_LABELS[key]);
  }
  if (keys[0] === "data" && kind.domain && kind.service) {
    const name =
      tryLocalize(
        sources,
        `component.${kind.domain}.services.${kind.service}.fields.${key}.name`
      ) ?? sources.services?.[kind.domain]?.[kind.service]?.fields?.[key]?.name;
    if (name) {
      return name;
    }
  }
  const typeLabel =
    keys.length === 1
      ? kind.trigger
        ? tryLocalize(
            sources,
            `ui.panel.config.automation.editor.triggers.type.${kind.trigger}.${key}`
          )
        : kind.condition
          ? tryLocalize(
              sources,
              `ui.panel.config.automation.editor.conditions.type.${kind.condition}.${key}`
            )
          : undefined
      : undefined;
  return typeLabel ?? humanizeKey(key);
};

const idName = (
  key: string | undefined,
  id: string,
  sources: ChangeTextSources
): string | undefined => {
  switch (key) {
    case "device_id": {
      const device = sources.devices?.[id];
      return device ? computeDeviceName(device) : undefined;
    }
    case "area_id":
      return sources.areas?.[id]?.name;
    case "floor_id":
      return sources.floors?.[id]?.name;
    case "label_id":
      return sources.labels?.find((label) => label.label_id === id)?.name;
    default:
      return sources.states?.[id]?.attributes.friendly_name;
  }
};

const formatValue = (
  value: unknown,
  key: string | undefined,
  kind: RowKind,
  sources: ChangeTextSources
): string => {
  if (value === undefined || value === null) {
    return "—";
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => formatValue(item, key, kind, sources))
      .join(", ");
  }
  if (typeof value === "boolean") {
    return sources.localize(value ? "ui.common.yes" : "ui.common.no");
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    const name = idName(key, value, sources);
    if (name) {
      return name;
    }
    // Choices like `sunset`, which the editor names too
    const type = kind.trigger ?? kind.condition;
    if (type && !type.includes(".") && /^[a-z_]+$/.test(value)) {
      return (
        tryLocalize(
          sources,
          `ui.panel.config.automation.editor.${kind.trigger ? "triggers" : "conditions"}.type.${type}.${value}`
        ) ?? value
      );
    }
    return value;
  }
  if (isDuration(value) && sources.locale) {
    return formatDurationLong(sources.locale, value);
  }
  if (isPlainObject(value)) {
    return Object.entries(value)
      .map(
        ([itemKey, item]) =>
          `${humanizeKey(itemKey)}: ${formatValue(item, itemKey, kind, sources)}`
      )
      .join(", ");
  }
  return String(value);
};

// An added or removed object, like the data of an action, as its fields
const flatten = (change: FieldChange): FieldChange[] => {
  const value = change.mark === "removed" ? change.oldValue : change.newValue;
  if (
    change.mark === "changed" ||
    !change.path.length ||
    !isPlainObject(value) ||
    isDuration(value)
  ) {
    return [change];
  }
  return Object.entries(value).flatMap(([key, item]) =>
    flatten({
      path: [...change.path, key],
      mark: change.mark,
      [change.mark === "removed" ? "oldValue" : "newValue"]: item,
    })
  );
};

// The unit of a number field of a service, like `%` for a brightness
const serviceFieldUnit = (
  keys: string[],
  kind: RowKind,
  sources: ChangeTextSources
): string | undefined => {
  if (keys[0] !== "data" || !kind.domain || !kind.service) {
    return undefined;
  }
  const selector: unknown =
    sources.services?.[kind.domain]?.[kind.service]?.fields?.[
      keys[keys.length - 1]
    ]?.selector;
  const number = isPlainObject(selector) ? selector.number : undefined;
  const unit = isPlainObject(number) ? number.unit_of_measurement : undefined;
  return typeof unit === "string" ? unit : undefined;
};

/**
 * Describes the changes of the fields of a row with the names the editor
 * uses: the fields of actions by their service, ids by the names of what
 * they point to, durations in words.
 */
export const describeFieldChanges = (
  changes: FieldChange[],
  row: unknown,
  sources: ChangeTextSources
): ChangeLine[] => {
  const kind = rowKind(row);
  return changes.flatMap(flatten).map((change) => {
    const keys = change.path.filter(
      (part): part is string => typeof part === "string"
    );
    const key = keys[keys.length - 1];
    const unit = serviceFieldUnit(keys, kind, sources);
    const format = (value: unknown) => {
      const text = formatValue(value, key, kind, sources);
      return unit && typeof value === "number" ? `${text} ${unit}` : text;
    };
    return {
      label: fieldLabel(change.path, kind, sources),
      mark: change.mark,
      oldValue: change.mark === "added" ? undefined : format(change.oldValue),
      newValue: change.mark === "removed" ? undefined : format(change.newValue),
    };
  });
};
