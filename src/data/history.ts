import { addDays, addMonths, startOfDay, startOfMonth } from "date-fns";
import { HassEntity } from "home-assistant-js-websocket";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import { LocalizeFunc } from "../common/translations/localize";
import { HomeAssistant } from "../types";
import { FrontendLocaleData } from "./translation";

const DOMAINS_USE_LAST_UPDATED = ["climate", "humidifier", "water_heater"];
const LINE_ATTRIBUTES_TO_KEEP = [
  "temperature",
  "current_temperature",
  "target_temp_low",
  "target_temp_high",
  "hvac_action",
  "humidity",
  "mode",
];

export interface LineChartState {
  state: string;
  last_changed: string;
  attributes?: Record<string, any>;
}

export interface LineChartEntity {
  domain: string;
  name: string;
  entity_id: string;
  states: LineChartState[];
}

export interface LineChartUnit {
  unit: string;
  identifier: string;
  data: LineChartEntity[];
}

export interface TimelineState {
  state_localize: string;
  state: string;
  last_changed: string;
}

export interface TimelineEntity {
  name: string;
  entity_id: string;
  data: TimelineState[];
}

export interface HistoryResult {
  line: LineChartUnit[];
  timeline: TimelineEntity[];
}

export type StatisticType = "sum" | "min" | "max" | "mean";

export interface Statistics {
  [statisticId: string]: StatisticValue[];
}

export interface StatisticValue {
  statistic_id: string;
  start: string;
  last_reset: string | null;
  max: number | null;
  mean: number | null;
  min: number | null;
  sum: number | null;
  state: number | null;
}

export interface StatisticsMetaData {
  unit_of_measurement: string;
  statistic_id: string;
}

export type StatisticsValidationResult =
  | StatisticsValidationResultUnsupportedUnit
  | StatisticsValidationResultUnitsChanged;

export interface StatisticsValidationResultUnsupportedUnit {
  type: "unsupported_unit";
  data: { statistic_id: string; device_class: string; state_unit: string };
}

export interface StatisticsValidationResultUnitsChanged {
  type: "units_changed";
  data: { statistic_id: string; state_unit: string; metadata_unit: string };
}
export interface StatisticsValidationResults {
  [statisticId: string]: StatisticsValidationResult[];
}

export const fetchRecent = (
  hass: HomeAssistant,
  entityId: string,
  startTime: Date,
  endTime: Date,
  skipInitialState = false,
  significantChangesOnly?: boolean,
  minimalResponse = true
): Promise<HassEntity[][]> => {
  let url = "history/period";
  if (startTime) {
    url += "/" + startTime.toISOString();
  }
  url += "?filter_entity_id=" + entityId;
  if (endTime) {
    url += "&end_time=" + endTime.toISOString();
  }
  if (skipInitialState) {
    url += "&skip_initial_state";
  }
  if (significantChangesOnly !== undefined) {
    url += `&significant_changes_only=${Number(significantChangesOnly)}`;
  }
  if (minimalResponse) {
    url += "&minimal_response";
  }

  return hass.callApi("GET", url);
};

export const fetchDate = (
  hass: HomeAssistant,
  startTime: Date,
  endTime: Date,
  entityId?: string
): Promise<HassEntity[][]> =>
  hass.callApi(
    "GET",
    `history/period/${startTime.toISOString()}?end_time=${endTime.toISOString()}&minimal_response${
      entityId ? `&filter_entity_id=${entityId}` : ``
    }`
  );

const equalState = (obj1: LineChartState, obj2: LineChartState) =>
  obj1.state === obj2.state &&
  // Only compare attributes if both states have an attributes object.
  // When `minimal_response` is sent, only the first and last state
  // will have attributes except for domains in DOMAINS_USE_LAST_UPDATED.
  (!obj1.attributes ||
    !obj2.attributes ||
    LINE_ATTRIBUTES_TO_KEEP.every(
      (attr) => obj1.attributes![attr] === obj2.attributes![attr]
    ));

const processTimelineEntity = (
  localize: LocalizeFunc,
  language: FrontendLocaleData,
  states: HassEntity[]
): TimelineEntity => {
  const data: TimelineState[] = [];
  const last_element = states.length - 1;

  for (const state of states) {
    if (data.length > 0 && state.state === data[data.length - 1].state) {
      continue;
    }

    // Copy the data from the last element as its the newest
    // and is only needed to localize the data
    if (!state.entity_id) {
      state.attributes = states[last_element].attributes;
      state.entity_id = states[last_element].entity_id;
    }

    data.push({
      state_localize: computeStateDisplay(localize, state, language),
      state: state.state,
      last_changed: state.last_changed,
    });
  }

  return {
    name: computeStateName(states[0]),
    entity_id: states[0].entity_id,
    data,
  };
};

const processLineChartEntities = (
  unit,
  entities: HassEntity[][]
): LineChartUnit => {
  const data: LineChartEntity[] = [];

  for (const states of entities) {
    const last: HassEntity = states[states.length - 1];
    const domain = computeStateDomain(last);
    const processedStates: LineChartState[] = [];

    for (const state of states) {
      let processedState: LineChartState;

      if (DOMAINS_USE_LAST_UPDATED.includes(domain)) {
        processedState = {
          state: state.state,
          last_changed: state.last_updated,
          attributes: {},
        };

        for (const attr of LINE_ATTRIBUTES_TO_KEEP) {
          if (attr in state.attributes) {
            processedState.attributes![attr] = state.attributes[attr];
          }
        }
      } else {
        processedState = state;
      }

      if (
        processedStates.length > 1 &&
        equalState(
          processedState,
          processedStates[processedStates.length - 1]
        ) &&
        equalState(processedState, processedStates[processedStates.length - 2])
      ) {
        continue;
      }

      processedStates.push(processedState);
    }

    data.push({
      domain,
      name: computeStateName(last),
      entity_id: last.entity_id,
      states: processedStates,
    });
  }

  return {
    unit,
    identifier: entities.map((states) => states[0].entity_id).join(""),
    data,
  };
};

export const computeHistory = (
  hass: HomeAssistant,
  stateHistory: HassEntity[][],
  localize: LocalizeFunc
): HistoryResult => {
  const lineChartDevices: { [unit: string]: HassEntity[][] } = {};
  const timelineDevices: TimelineEntity[] = [];
  if (!stateHistory) {
    return { line: [], timeline: [] };
  }

  stateHistory.forEach((stateInfo) => {
    if (stateInfo.length === 0) {
      return;
    }

    const stateWithUnitorStateClass = stateInfo.find(
      (state) =>
        state.attributes &&
        ("unit_of_measurement" in state.attributes ||
          "state_class" in state.attributes)
    );

    let unit: string | undefined;

    if (stateWithUnitorStateClass) {
      unit = stateWithUnitorStateClass.attributes.unit_of_measurement || " ";
    } else {
      unit = {
        climate: hass.config.unit_system.temperature,
        counter: "#",
        humidifier: "%",
        input_number: "#",
        number: "#",
        water_heater: hass.config.unit_system.temperature,
      }[computeStateDomain(stateInfo[0])];
    }

    if (!unit) {
      timelineDevices.push(
        processTimelineEntity(localize, hass.locale, stateInfo)
      );
    } else if (unit in lineChartDevices) {
      lineChartDevices[unit].push(stateInfo);
    } else {
      lineChartDevices[unit] = [stateInfo];
    }
  });

  const unitStates = Object.keys(lineChartDevices).map((unit) =>
    processLineChartEntities(unit, lineChartDevices[unit])
  );

  return { line: unitStates, timeline: timelineDevices };
};

// Statistics

export const getStatisticIds = (
  hass: HomeAssistant,
  statistic_type?: "mean" | "sum"
) =>
  hass.callWS<StatisticsMetaData[]>({
    type: "history/list_statistic_ids",
    statistic_type,
  });

export const fetchStatistics = (
  hass: HomeAssistant,
  startTime: Date,
  endTime?: Date,
  statistic_ids?: string[],
  period: "hour" | "5minute" = "hour"
) =>
  hass.callWS<Statistics>({
    type: "history/statistics_during_period",
    start_time: startTime.toISOString(),
    end_time: endTime?.toISOString(),
    statistic_ids,
    period,
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

// Merge the growth of multiple sum statistics into one
const mergeSumGrowthStatistics = (stats: StatisticValue[][]) => {
  const result = {};

  stats.forEach((stat) => {
    if (stat.length === 0) {
      return;
    }
    let prevSum: number | null = null;
    stat.forEach((statVal) => {
      if (statVal.sum === null) {
        return;
      }
      if (prevSum === null) {
        prevSum = statVal.sum;
        return;
      }
      const growth = statVal.sum - prevSum;
      if (statVal.start in result) {
        result[statVal.start] += growth;
      } else {
        result[statVal.start] = growth;
      }
      prevSum = statVal.sum;
    });
  });

  return result;
};

/**
 * Get the growth of a statistic over the given period while applying a
 * per-period percentage.
 */
export const calculateStatisticsSumGrowthWithPercentage = (
  percentageStat: StatisticValue[],
  sumStats: StatisticValue[][]
): number | null => {
  let sum: number | null = null;

  if (sumStats.length === 0 || percentageStat.length === 0) {
    return null;
  }

  const sumGrowthToProcess = mergeSumGrowthStatistics(sumStats);

  percentageStat.forEach((percentageStatValue) => {
    const sumGrowth = sumGrowthToProcess[percentageStatValue.start];
    if (sumGrowth === undefined) {
      return;
    }
    if (sum === null) {
      sum = sumGrowth * (percentageStatValue.mean! / 100);
    } else {
      sum += sumGrowth * (percentageStatValue.mean! / 100);
    }
  });

  return sum;
};

export const reduceSumStatisticsByDay = (
  values: StatisticValue[]
): StatisticValue[] => {
  if (!values?.length) {
    return [];
  }
  const result: StatisticValue[] = [];
  if (
    values.length > 1 &&
    new Date(values[0].start).getDate() === new Date(values[1].start).getDate()
  ) {
    // add init value if the first value isn't end of previous period
    result.push({
      ...values[0]!,
      start: startOfMonth(addDays(new Date(values[0].start), -1)).toISOString(),
    });
  }
  let lastValue: StatisticValue;
  let prevDate: number | undefined;
  for (const value of values) {
    const date = new Date(value.start).getDate();
    if (prevDate === undefined) {
      prevDate = date;
    }
    if (prevDate !== date) {
      // Last value of the day
      result.push({
        ...lastValue!,
        start: startOfDay(new Date(lastValue!.start)).toISOString(),
      });
      prevDate = date;
    }
    lastValue = value;
  }
  // Add final value
  result.push({
    ...lastValue!,
    start: startOfDay(new Date(lastValue!.start)).toISOString(),
  });
  return result;
};

export const reduceSumStatisticsByMonth = (
  values: StatisticValue[]
): StatisticValue[] => {
  if (!values?.length) {
    return [];
  }
  const result: StatisticValue[] = [];
  if (
    values.length > 1 &&
    new Date(values[0].start).getMonth() ===
      new Date(values[1].start).getMonth()
  ) {
    // add init value if the first value isn't end of previous period
    result.push({
      ...values[0]!,
      start: startOfMonth(
        addMonths(new Date(values[0].start), -1)
      ).toISOString(),
    });
  }
  let lastValue: StatisticValue;
  let prevMonth: number | undefined;
  for (const value of values) {
    const month = new Date(value.start).getMonth();
    if (prevMonth === undefined) {
      prevMonth = month;
    }
    if (prevMonth !== month) {
      // Last value of the day
      result.push({
        ...lastValue!,
        start: startOfMonth(new Date(lastValue!.start)).toISOString(),
      });
      prevMonth = month;
    }
    lastValue = value;
  }
  // Add final value
  result.push({
    ...lastValue!,
    start: startOfMonth(new Date(lastValue!.start)).toISOString(),
  });
  return result;
};
