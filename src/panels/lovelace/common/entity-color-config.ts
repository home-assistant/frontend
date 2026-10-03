import { isCustomType } from "../../../data/lovelace_custom_cards";

interface LegacyStateColorConfig {
  type?: string;
  color?: string;
  state_color?: boolean;
}

export const migrateStateColorConfig = <T extends LegacyStateColorConfig>(
  config: T
): T => {
  // Custom elements own their config schema, leave them untouched
  if (config.type !== undefined && isCustomType(config.type)) {
    return config;
  }
  if (config.state_color === undefined) {
    return config;
  }
  const { state_color, ...rest } = config;
  return {
    color: state_color ? "state" : "none",
    ...rest,
  } as T;
};

export const applyDefaultColor = <T extends { type?: string; color?: string }>(
  config: T,
  color: string | undefined
): T =>
  color === undefined ||
  config.color !== undefined ||
  (config.type !== undefined && isCustomType(config.type))
    ? config
    : { ...config, color };
