import { durationDataToSeconds } from "../../common/datetime/duration_to_seconds";
import { durationValueToData } from "../../common/datetime/duration_value_to_data";
import type { HaDurationData } from "../../components/ha-duration-input";
import type { PlatformTrigger } from "../automation";
import { TRIGGER_ROW_CONFIG_KEYS } from "../automation";
import type { OffsetSelectorValue } from "../selector";
import type { TriggerDescription } from "../trigger";

const TRIGGER_KEYS: (keyof PlatformTrigger)[] = [
  ...TRIGGER_ROW_CONFIG_KEYS,
  "trigger",
  "target",
  "options",
];

const isOffsetSelectorValue = (value: unknown): value is OffsetSelectorValue =>
  typeof value === "object" && value !== null && "type" in value;

const absDuration = (duration: HaDurationData): HaDurationData =>
  Object.fromEntries(
    Object.entries(duration).map(([field, amount]) => [
      field,
      Math.abs(amount ?? 0),
    ])
  );

const migrateLegacyOffsetOptions = (
  options: Record<string, unknown>,
  fields: TriggerDescription["fields"]
): Record<string, unknown> => {
  let migrated: Record<string, unknown> | undefined;

  for (const [key, field] of Object.entries(fields)) {
    if (!field.selector || !("offset" in field.selector)) {
      continue;
    }
    const typeKey = `${key}_type`;
    const value = options[key] as OffsetSelectorValue["duration"] | undefined;
    const hasLegacyType = typeKey in options;
    if (
      !hasLegacyType &&
      (value === undefined || isOffsetSelectorValue(value))
    ) {
      continue;
    }
    migrated ??= { ...options };
    delete migrated[typeKey];
    if (isOffsetSelectorValue(value)) {
      continue;
    }

    const duration = durationValueToData(value ?? 0);
    if (!duration || Object.values(duration).some((amount) => isNaN(amount))) {
      continue;
    }
    let seconds = durationDataToSeconds(duration);
    // The released trigger schema defaulted offset_type to before
    if (options[typeKey] !== "after") {
      seconds = -seconds;
    }
    migrated[key] =
      seconds === 0
        ? { type: "none" }
        : {
            type: seconds < 0 ? "before" : "after",
            duration: absDuration(duration),
          };
  }

  return migrated ?? options;
};

const moveStrayKeysToOptions = (
  trigger: PlatformTrigger
): PlatformTrigger | undefined => {
  let migrated: PlatformTrigger | undefined;
  for (const key in trigger) {
    if (TRIGGER_KEYS.includes(key as keyof PlatformTrigger)) {
      continue;
    }
    migrated ??= { ...trigger, options: { ...trigger.options } };
    migrated.options![key] = trigger[key];
    delete migrated[key];
  }
  return migrated;
};

export const migratePlatformTrigger = (
  trigger: PlatformTrigger,
  description?: TriggerDescription
): PlatformTrigger | undefined => {
  let migrated = moveStrayKeysToOptions(trigger);

  const options = (migrated ?? trigger).options;
  if (options && description?.fields) {
    const migratedOptions = migrateLegacyOffsetOptions(
      options,
      description.fields
    );
    if (migratedOptions !== options) {
      migrated = { ...(migrated ?? trigger), options: migratedOptions };
    }
  }

  return migrated;
};
