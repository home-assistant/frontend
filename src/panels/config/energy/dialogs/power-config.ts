import type { PowerConfig } from "../../../../data/energy";

export type PowerType = "none" | "standard" | "inverted" | "two_sensors";

/**
 * Extracts the power type from a PowerConfig object.
 */
export function getPowerTypeFromConfig(
  powerConfig?: PowerConfig,
  statRate?: string
): PowerType {
  if (powerConfig) {
    if (powerConfig.stat_rate_inverted) {
      return "inverted";
    }
    if (powerConfig.stat_rate_from || powerConfig.stat_rate_to) {
      return "two_sensors";
    }
    if (powerConfig.stat_rate) {
      return "standard";
    }
  } else if (statRate) {
    // Legacy format - treat as standard
    return "standard";
  }
  return "none";
}

/**
 * Creates an initial PowerConfig from existing config or legacy stat_rate.
 */
export function getInitialPowerConfig(
  powerConfig?: PowerConfig,
  statRate?: string
): PowerConfig {
  if (powerConfig) {
    return { ...powerConfig };
  }
  if (statRate) {
    return { stat_rate: statRate };
  }
  return {};
}

/**
 * Checks that the power config is complete for the selected power type.
 */
export function isPowerConfigValid(
  powerType: PowerType,
  powerConfig: PowerConfig
): boolean {
  switch (powerType) {
    case "none":
      return true;
    case "standard":
      return !!powerConfig.stat_rate;
    case "inverted":
      return !!powerConfig.stat_rate_inverted;
    case "two_sensors":
      return !!powerConfig.stat_rate_from && !!powerConfig.stat_rate_to;
    default:
      return false;
  }
}

/**
 * Builds an exclude list for power statistics from existing sources.
 */
export function buildPowerExcludeList(
  sources: { stat_rate?: string; power_config?: PowerConfig }[],
  currentPowerConfig: PowerConfig,
  currentStatRate?: string
): string[] {
  const powerIds: string[] = [];

  sources.forEach((entry) => {
    if (entry.stat_rate) powerIds.push(entry.stat_rate);
    if (entry.power_config) {
      if (entry.power_config.stat_rate) {
        powerIds.push(entry.power_config.stat_rate);
      }
      if (entry.power_config.stat_rate_inverted) {
        powerIds.push(entry.power_config.stat_rate_inverted);
      }
      if (entry.power_config.stat_rate_from) {
        powerIds.push(entry.power_config.stat_rate_from);
      }
      if (entry.power_config.stat_rate_to) {
        powerIds.push(entry.power_config.stat_rate_to);
      }
    }
  });

  const currentPowerIds = [
    currentPowerConfig.stat_rate,
    currentPowerConfig.stat_rate_inverted,
    currentPowerConfig.stat_rate_from,
    currentPowerConfig.stat_rate_to,
    currentStatRate,
  ].filter(Boolean) as string[];

  return powerIds.filter((id) => !currentPowerIds.includes(id));
}
