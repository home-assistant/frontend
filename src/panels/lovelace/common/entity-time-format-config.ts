import { isCustomType } from "../../../data/lovelace_custom_cards";
import type { TimestampRenderingFormat } from "../components/types";

interface LegacyTimeFormatConfig {
  type?: string;
  time_format?: TimestampRenderingFormat;
  /** @deprecated use `time_format` instead */
  format?: TimestampRenderingFormat;
}

export const migrateTimeFormatConfig = <T extends LegacyTimeFormatConfig>(
  config: T
): T => {
  // Custom elements own their config schema and may use the same option with
  // a different meaning (e.g. custom:multiple-entity-row), leave them untouched
  if (config.type !== undefined && isCustomType(config.type)) {
    return config;
  }
  if (config.format === undefined) {
    return config;
  }
  const { format, ...rest } = config;
  return {
    time_format: format,
    ...rest,
  } as T;
};
