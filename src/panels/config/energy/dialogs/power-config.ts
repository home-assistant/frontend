import type {
  BatteryDirectionsPowerConfig,
  BatteryDirectionsSourceTypeEnergyPreference,
  BatterySourceTypeEnergyPreference,
  PowerConfig,
} from "../../../../data/energy";
import {
  getBatteryEnergyStatIds,
  isBatteryDirections,
} from "../../../../data/energy";
import { deepEqual } from "../../../../common/util/deep-equal";

export type PowerType = "none" | "standard" | "inverted" | "two_sensors";

export type BatteryMode = "total" | "directions";

export const BATTERY_DIRECTIONS = [
  {
    key: "from_grid",
    energy: "stat_energy_from_grid",
    power: "stat_rate_from_grid",
    charge: true,
  },
  {
    key: "from_solar",
    energy: "stat_energy_from_solar",
    power: "stat_rate_from_solar",
    charge: true,
  },
  {
    key: "to_home",
    energy: "stat_energy_to_home",
    power: "stat_rate_to_home",
    charge: false,
  },
  {
    key: "to_grid",
    energy: "stat_energy_to_grid",
    power: "stat_rate_to_grid",
    charge: false,
  },
] as const satisfies readonly {
  key: string;
  energy: keyof BatteryDirectionsSourceTypeEnergyPreference;
  power: keyof BatteryDirectionsPowerConfig;
  charge: boolean;
}[];

export type BatteryDirection = (typeof BATTERY_DIRECTIONS)[number];

export const getBatteryMode = (
  source?: BatterySourceTypeEnergyPreference
): BatteryMode | undefined =>
  source ? (isBatteryDirections(source) ? "directions" : "total") : undefined;

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
      powerIds.push(
        ...Object.values(entry.power_config).filter((id): id is string => !!id)
      );
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

/**
 * Returns the statistics the other batteries use in either mode. The edited
 * battery can't reuse them.
 */
export function buildBatteryExcludeList(
  sources: BatterySourceTypeEnergyPreference[],
  current?: BatterySourceTypeEnergyPreference
): string[] {
  const currentIndex = current
    ? sources.findIndex((source) => deepEqual(source, current))
    : -1;
  return sources.flatMap((source, index) => {
    if (index === currentIndex) {
      return [];
    }
    const { charge, discharge } = getBatteryEnergyStatIds(source);
    return [
      ...charge,
      ...discharge,
      source.stat_rate,
      ...Object.values(source.power_config ?? {}),
    ].filter((id): id is string => !!id);
  });
}

const isDirectionPowerConfig = (
  config: PowerConfig | BatteryDirectionsPowerConfig
): config is BatteryDirectionsPowerConfig =>
  BATTERY_DIRECTIONS.some(
    ({ power }) => !!(config as BatteryDirectionsPowerConfig)[power]
  );

/**
 * Returns the entity id of the power sensor the backend generated for a saved
 * source, if any. Inverted, two sensor and battery direction configs get such
 * a helper, its entity id is stored in `stat_rate`. Returns nothing while the
 * config differs from the saved one, as the helper doesn't match the edited
 * config yet.
 */
export function getPowerHelperEntityId(
  source:
    | {
        stat_rate?: string;
        power_config?: PowerConfig | BatteryDirectionsPowerConfig;
      }
    | undefined,
  currentPowerConfig: PowerConfig | BatteryDirectionsPowerConfig
): string | undefined {
  if (!source?.stat_rate || !source.power_config) {
    return undefined;
  }
  if (!isDirectionPowerConfig(source.power_config)) {
    const savedPowerType = getPowerTypeFromConfig(source.power_config);
    if (savedPowerType !== "inverted" && savedPowerType !== "two_sensors") {
      return undefined;
    }
  }
  if (!deepEqual(source.power_config, currentPowerConfig)) {
    return undefined;
  }
  return source.stat_rate;
}
