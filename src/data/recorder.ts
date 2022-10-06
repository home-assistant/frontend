import { computeStateName } from "../common/entity/compute_state_name";
import { HomeAssistant } from "../types";

export type StatisticType = "state" | "sum" | "min" | "max" | "mean";

export interface Statistics {
  [statisticId: string]: StatisticValue[];
}

export interface StatisticValue {
  statistic_id: string;
  start: string;
  end: string;
  last_reset: string | null;
  max: number | null;
  mean: number | null;
  min: number | null;
  sum: number | null;
  state: number | null;
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
  energy?: "Wh" | "kWh" | "MWh";
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
  volume?: "ft³" | "m³";
}

export interface StatisticsValidationResults {
  [statisticId: string]: StatisticsValidationResult[];
}

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
  period: "5minute" | "hour" | "day" | "month" = "hour",
  units?: StatisticsUnitConfiguration
) =>
  hass.callWS<Statistics>({
    type: "recorder/statistics_during_period",
    start_time: startTime.toISOString(),
    end_time: endTime?.toISOString(),
    statistic_ids,
    period,
    units,
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
  if (!values || values.length < 2) {
    return null;
  }
  const endSum = values[values.length - 1].sum;
  if (endSum === null) {
    return null;
  }
  const startSum = values[0].sum;
  if (startSum === null) {
    return endSum;
  }
  return endSum - startSum;
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
) => stats.some((stat) => stat[type] !== null);

const mean_stat_types: readonly StatisticType[] = ["mean", "min", "max"];
const sum_stat_types: readonly StatisticType[] = ["sum"];

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
  start_time: string,
  adjustment: number,
  adjustment_unit_of_measurement: string | null
): Promise<void> =>
  hass.callWS({
    type: "recorder/adjust_sum_statistics",
    statistic_id,
    start_time,
    adjustment,
    adjustment_unit_of_measurement,
  });

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
