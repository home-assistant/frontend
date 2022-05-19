import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateDisplayFromEntityAttributes } from "../common/entity/compute_state_display";
import { computeStateNameFromEntityAttributes } from "../common/entity/compute_state_name";
import { LocalizeFunc } from "../common/translations/localize";
import { HomeAssistant } from "../types";
import { FrontendLocaleData } from "./translation";

const DOMAINS_USE_LAST_UPDATED = ["climate", "humidifier", "water_heater"];
const NEED_ATTRIBUTE_DOMAINS = [
  "climate",
  "humidifier",
  "input_datetime",
  "thermostat",
  "water_heater",
];
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
  last_changed: number;
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
  last_changed: number;
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
  end: string;
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
  source: string;
  name?: string | null;
  has_sum: boolean;
  has_mean: boolean;
}

export type StatisticsValidationResult =
  | StatisticsValidationResultNoState
  | StatisticsValidationResultEntityNotRecorded
  | StatisticsValidationResultEntityNoLongerRecorded
  | StatisticsValidationResultUnsupportedStateClass
  | StatisticsValidationResultUnitsChanged
  | StatisticsValidationResultUnsupportedUnitMetadata
  | StatisticsValidationResultUnsupportedUnitState;

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
  data: { statistic_id: string; state_unit: string; metadata_unit: string };
}

export interface StatisticsValidationResultUnsupportedUnitMetadata {
  type: "unsupported_unit_metadata";
  data: {
    statistic_id: string;
    device_class: string;
    metadata_unit: string;
    supported_unit: string;
  };
}

export interface StatisticsValidationResultUnsupportedUnitState {
  type: "unsupported_unit_state";
  data: { statistic_id: string; device_class: string; metadata_unit: string };
}

export interface StatisticsValidationResults {
  [statisticId: string]: StatisticsValidationResult[];
}

export interface HistoryStates {
  [entityId: string]: EntityHistoryState[];
}

interface EntityHistoryState {
  /** state */
  s: string;
  /** attributes */
  a: { [key: string]: any };
  /** last_changed; if set, also applies to lu */
  lc: number;
  /** last_updated */
  lu: number;
}

export const entityIdHistoryNeedsAttributes = (
  hass: HomeAssistant,
  entityId: string
) =>
  !hass.states[entityId] ||
  NEED_ATTRIBUTE_DOMAINS.includes(computeDomain(entityId));

export const fetchRecent = (
  hass: HomeAssistant,
  entityId: string,
  startTime: Date,
  endTime: Date,
  skipInitialState = false,
  significantChangesOnly?: boolean,
  minimalResponse = true,
  noAttributes?: boolean
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
  if (noAttributes) {
    url += "&no_attributes";
  }
  return hass.callApi("GET", url);
};

export const fetchRecentWS = (
  hass: HomeAssistant,
  entityId: string,
  startTime: Date,
  endTime: Date,
  skipInitialState = false,
  significantChangesOnly?: boolean,
  minimalResponse = true,
  noAttributes?: boolean
) =>
  hass.callWS<HistoryStates>({
    type: "history/history_during_period",
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    significant_changes_only: significantChangesOnly || false,
    include_start_time_state: !skipInitialState,
    minimal_response: minimalResponse,
    no_attributes: noAttributes || false,
    entity_ids: [entityId],
  });

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
    }${
      entityId && !entityIdHistoryNeedsAttributes(hass, entityId)
        ? `&no_attributes`
        : ``
    }`
  );

export const fetchDateWS = (
  hass: HomeAssistant,
  startTime: Date,
  endTime: Date,
  entityId?: string
) => {
  const params = {
    type: "history/history_during_period",
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    minimal_response: true,
    no_attributes: !!(
      entityId && !entityIdHistoryNeedsAttributes(hass, entityId)
    ),
  };
  if (entityId) {
    return hass.callWS<HistoryStates>({ ...params, entity_ids: [entityId] });
  }
  return hass.callWS<HistoryStates>(params);
};

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
  entityId: string,
  states: EntityHistoryState[]
): TimelineEntity => {
  const data: TimelineState[] = [];
  const first: EntityHistoryState = states[0];
  for (const state of states) {
    if (data.length > 0 && state.s === data[data.length - 1].state) {
      continue;
    }
    data.push({
      state_localize: computeStateDisplayFromEntityAttributes(
        localize,
        language,
        entityId,
        state.a || first.a,
        state.s
      ),
      state: state.s,
      // lc (last_changed) may be omitted if its the same
      // as lu (last_updated).
      last_changed: (state.lc ? state.lc : state.lu) * 1000,
    });
  }

  return {
    name: computeStateNameFromEntityAttributes(entityId, states[0].a),
    entity_id: entityId,
    data,
  };
};

const processLineChartEntities = (
  unit,
  entities: HistoryStates
): LineChartUnit => {
  const data: LineChartEntity[] = [];

  Object.keys(entities).forEach((entityId) => {
    const states = entities[entityId];
    const first: EntityHistoryState = states[0];
    const domain = computeDomain(entityId);
    const processedStates: LineChartState[] = [];

    for (const state of states) {
      let processedState: LineChartState;

      if (DOMAINS_USE_LAST_UPDATED.includes(domain)) {
        processedState = {
          state: state.s,
          last_changed: state.lu * 1000,
          attributes: {},
        };

        for (const attr of LINE_ATTRIBUTES_TO_KEEP) {
          if (attr in state.a) {
            processedState.attributes![attr] = state.a[attr];
          }
        }
      } else {
        processedState = {
          state: state.s,
          // lc (last_changed) may be omitted if its the same
          // as lu (last_updated).
          last_changed: (state.lc ? state.lc : state.lu) * 1000,
          attributes: {},
        };
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
      name: computeStateNameFromEntityAttributes(entityId, first.a),
      entity_id: entityId,
      states: processedStates,
    });
  });

  return {
    unit,
    identifier: Object.keys(entities).join(""),
    data,
  };
};

const stateUsesUnits = (state: HassEntity) =>
  attributesHaveUnits(state.attributes);

const attributesHaveUnits = (attributes: { [key: string]: any }) =>
  "unit_of_measurement" in attributes || "state_class" in attributes;

export const computeHistory = (
  hass: HomeAssistant,
  stateHistory: HistoryStates,
  localize: LocalizeFunc
): HistoryResult => {
  const lineChartDevices: { [unit: string]: HistoryStates } = {};
  const timelineDevices: TimelineEntity[] = [];
  if (!stateHistory) {
    return { line: [], timeline: [] };
  }
  Object.keys(stateHistory).forEach((entityId) => {
    const stateInfo = stateHistory[entityId];
    if (stateInfo.length === 0) {
      return;
    }

    const currentState =
      entityId in hass.states ? hass.states[entityId] : undefined;
    const stateWithUnitorStateClass =
      !currentState &&
      stateInfo.find((state) => state.a && attributesHaveUnits(state.a));

    let unit: string | undefined;

    if (currentState && stateUsesUnits(currentState)) {
      unit = currentState.attributes.unit_of_measurement || " ";
    } else if (stateWithUnitorStateClass) {
      unit = stateWithUnitorStateClass.a.unit_of_measurement || " ";
    } else {
      unit = {
        climate: hass.config.unit_system.temperature,
        counter: "#",
        humidifier: "%",
        input_number: "#",
        number: "#",
        water_heater: hass.config.unit_system.temperature,
      }[computeDomain(entityId)];
    }

    if (!unit) {
      timelineDevices.push(
        processTimelineEntity(localize, hass.locale, entityId, stateInfo)
      );
    } else if (unit in lineChartDevices && entityId in lineChartDevices[unit]) {
      lineChartDevices[unit][entityId].push(...stateInfo);
    } else {
      if (!(unit in lineChartDevices)) {
        lineChartDevices[unit] = {};
      }
      lineChartDevices[unit][entityId] = stateInfo;
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
  period: "5minute" | "hour" | "day" | "month" = "hour"
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

export const adjustStatisticsSum = (
  hass: HomeAssistant,
  statistic_id: string,
  start_time: string,
  adjustment: number
): Promise<void> =>
  hass.callWS({
    type: "recorder/adjust_sum_statistics",
    statistic_id,
    start_time,
    adjustment,
  });
