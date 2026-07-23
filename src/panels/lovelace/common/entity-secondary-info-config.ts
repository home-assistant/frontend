import { isCustomType } from "../../../data/lovelace_custom_cards";

interface LegacySecondaryInfoConfig {
  type?: string;
  secondary_info?: string | string[];
}

const SUBSTITUTIONS = {
  "last-changed": "last_changed",
  "last-updated": "last_updated",
  "last-triggered": "last_triggered",
  position: "current_position",
  "tilt-position": "current_tilt_position",
  area: "area_name",
};

export const migrateSecondaryInfoConfig = <T extends LegacySecondaryInfoConfig>(
  config: T
): T => {
  // Custom elements own their config schema and may use the same option with
  // a different meaning, leave them untouched
  if (config.type !== undefined && isCustomType(config.type)) {
    return config;
  }
  if (
    config.secondary_info === undefined ||
    typeof config.secondary_info !== "string" ||
    !(config.secondary_info in SUBSTITUTIONS)
  ) {
    return config;
  }
  return {
    ...config,
    secondary_info: SUBSTITUTIONS[config.secondary_info],
  } as T;
};
