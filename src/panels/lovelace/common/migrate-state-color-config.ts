export interface LegacyStateColorConfig {
  color?: string;
  state_color?: boolean;
}

export const migrateStateColorConfig = <T extends LegacyStateColorConfig>(
  config: T
): T => {
  if (config.state_color === undefined) {
    return config;
  }
  const { state_color, ...rest } = config;
  return {
    color: state_color ? "state" : "none",
    ...rest,
  } as T;
};
