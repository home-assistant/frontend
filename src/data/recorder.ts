import { Connection } from "home-assistant-js-websocket";
import { computeStateName } from "../common/entity/compute_state_name";
import { HaDurationData } from "../components/ha-duration-input";
import { HomeAssistant } from "../types";

export interface RecorderInfo {
  backlog: number | null;
  max_backlog: number;
  migration_in_progress: boolean;
  migration_is_live: boolean;
  recording: boolean;
  thread_running: boolean;
}

export type StatisticType = "change" | "state" | "sum" | "min" | "max" | "mean";

export interface Statistics {
  [statisticId: string]: StatisticValue[];
}

export interface StatisticValue {
  start: number;
  end: number;
  change?: number | null;
  last_reset?: number | null;
  max?: number | null;
  mean?: number | null;
  min?: number | null;
  sum?: number | null;
  state?: number | null;
}

export interface Statistic {
  max: number | null;
  mean: number | null;
  min: number | null;
  change: number | null;
}

export interface StatisticsMetaData {
  statistics_unit_of_measurement: string | null;
  statistic_id: string;
  source: string;
  name?: string | null;
  has_sum: boolean;
  has_mean: boolean;
  unit_class: string | null;
}

export type StatisticsValidationResult =
  | StatisticsValidationResultNoState
  | StatisticsValidationResultEntityNotRecorded
  | StatisticsValidationResultEntityNoLongerRecorded
  | StatisticsValidationResultUnsupportedStateClass
  | StatisticsValidationResultUnitsChanged;

export interface StatisticsValidationResultNoState {
  type: "no_state";
  data: { statistic_id: string };
}

export interface StatisticsValidationResultEntityNoLongerRecorded {
  type: "entity_no_longer_recorded";
  data: { statistic_id: string };
}

export interface StatisticsValidationResultEntityNotRecorded {
  type: "entity_not_recorded";
  data: { statistic_id: string };
}

export interface StatisticsValidationResultUnsupportedStateClass {
  type: "unsupported_state_class";
  data: { statistic_id: string; state_class: string };
}

export interface StatisticsValidationResultUnitsChanged {
  type: "units_changed";
  data: {
    statistic_id: string;
    state_unit: string;
    metadata_unit: string;
    supported_unit: string;
  };
}

export interface StatisticsUnitConfiguration {
  energy?: "Wh" | "kWh" | "MWh" | "GJ";
  power?: "W" | "kW";
  pressure?:
    | "Pa"
    | "hPa"
    | "kPa"
    | "bar"
    | "cbar"
    | "mbar"
    | "inHg"
    | "psi"
    | "mmHg";
  temperature?: "°C" | "°F" | "K";
  volume?: "L" | "gal" | "ft³" | "m³";
}

const statisticTypes = [
  "change",
  "last_reset",
  "max",
  "mean",
  "min",
  "state",
  "sum",
] as const;
export type StatisticsTypes = (typeof statisticTypes)[number][];

export interface StatisticsValidationResults {
  [statisticId: string]: StatisticsValidationResult[];
}

export const getRecorderInfo = (conn: Connection) =>
  conn.sendMessagePromise<RecorderInfo>({
    type: "recorder/info",
  });

export const getStatisticIds = (
  hass: HomeAssistant,
  statistic_type?: "mean" | "sum"
) =>
  hass.callWS<StatisticsMetaData[]>({
    type: "recorder/list_statistic_ids",
    statistic_type,
  });

export const getStatisticMetadata = (
  hass: HomeAssistant,
  statistic_ids?: string[]
) =>
  hass.callWS<StatisticsMetaData[]>({
    type: "recorder/get_statistics_metadata",
    statistic_ids,
  });

export const fetchStatistics = (
  hass: HomeAssistant,
  startTime: Date,
  endTime?: Date,
  statistic_ids?: string[],
  period: "5minute" | "hour" | "day" | "week" | "month" = "hour",
  units?: StatisticsUnitConfiguration,
  types?: StatisticsTypes
) =>
  hass.callWS<Statistics>({
    type: "recorder/statistics_during_period",
    start_time: startTime.toISOString(),
    end_time: endTime?.toISOString(),
    statistic_ids,
    period,
    units,
    types,
  });

export const fetchStatistic = (
  hass: HomeAssistant,
  statistic_id: string,
  period: {
    fixed_period?: { start: string | Date; end: string | Date };
    calendar?: { period: string; offset: number };
    rolling_window?: { duration: HaDurationData; offset: HaDurationData };
  },
  units?: StatisticsUnitConfiguration
) =>
  hass.callWS<Statistic>({
    type: "recorder/statistic_during_period",
    statistic_id,
    units,
    fixed_period: period.fixed_period
      ? {
          start_time:
            period.fixed_period.start instanceof Date
              ? period.fixed_period.start.toISOString()
              : period.fixed_period.start,
          end_time:
            period.fixed_period.end instanceof Date
              ? period.fixed_period.end.toISOString()
              : period.fixed_period.end,
        }
      : undefined,
    calendar: period.calendar,
    rolling_window: period.rolling_window,
  });

export const validateStatistics = (hass: HomeAssistant) =>
  hass.callWS<StatisticsValidationResults>({
    type: "recorder/validate_statistics",
  });

export const updateStatisticsMetadata = (
  hass: HomeAssistant,
  statistic_id: string,
  unit_of_measurement: string | null
) =>
  hass.callWS<void>({
    type: "recorder/update_statistics_metadata",
    statistic_id,
    unit_of_measurement,
  });

export const clearStatistics = (hass: HomeAssistant, statistic_ids: string[]) =>
  hass.callWS<void>({
    type: "recorder/clear_statistics",
    statistic_ids,
  });

export const calculateStatisticSumGrowth = (
  values: StatisticValue[]
): number | null => {
  let growth: number | null = null;

  if (!values) {
    return null;
  }

  for (const value of values) {
    if (value.change === null || value.change === undefined) {
      continue;
    }
    if (growth === null) {
      growth = value.change;
    } else {
      growth += value.change;
    }
  }

  return growth;
};

export const calculateStatisticsSumGrowth = (
  data: Statistics,
  stats: string[]
): number | null => {
  let totalGrowth: number | null = null;

  for (const stat of stats) {
    if (!(stat in data)) {
      continue;
    }
    const statGrowth = calculateStatisticSumGrowth(data[stat]);

    if (statGrowth === null) {
      continue;
    }
    if (totalGrowth === null) {
      totalGrowth = statGrowth;
    } else {
      totalGrowth += statGrowth;
    }
  }

  return totalGrowth;
};

export const statisticsHaveType = (
  stats: StatisticValue[],
  type: StatisticType
) => stats.some((stat) => stat[type] !== undefined && stat[type] !== null);

const mean_stat_types: readonly StatisticType[] = ["mean", "min", "max"];
const sum_stat_types: readonly StatisticType[] = ["sum", "state", "change"];

export const statisticsMetaHasType = (
  metadata: StatisticsMetaData,
  type: StatisticType
) => {
  if (mean_stat_types.includes(type) && metadata.has_mean) {
    return true;
  }
  if (sum_stat_types.includes(type) && metadata.has_sum) {
    return true;
  }
  return false;
};

export const adjustStatisticsSum = (
  hass: HomeAssistant,
  statistic_id: string,
  start_time: number,
  adjustment: number,
  adjustment_unit_of_measurement: string | null
): Promise<void> => {
  const start_time_iso = new Date(start_time).toISOString();
  return hass.callWS({
    type: "recorder/adjust_sum_statistics",
    statistic_id,
    start_time: start_time_iso,
    adjustment,
    adjustment_unit_of_measurement,
  });
};

export const getStatisticLabel = (
  hass: HomeAssistant,
  statisticsId: string,
  statisticsMetaData: StatisticsMetaData | undefined
): string => {
  const entity = hass.states[statisticsId];
  if (entity) {
    return computeStateName(entity);
  }
  return statisticsMetaData?.name || statisticsId;
};

export const getDisplayUnit = (
  hass: HomeAssistant,
  statisticsId: string | undefined,
  statisticsMetaData: StatisticsMetaData | undefined
): string | null | undefined => {
  let unit: string | undefined;
  if (statisticsId) {
    unit = hass.states[statisticsId]?.attributes.unit_of_measurement;
  }
  return unit === undefined
    ? statisticsMetaData?.statistics_unit_of_measurement
    : unit;
};

export const isExternalStatistic = (statisticsId: string): boolean =>
  statisticsId.includes(":");
