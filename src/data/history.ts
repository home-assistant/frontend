import { computeStateName } from "../common/entity/compute_state_name";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";
import { LocalizeFunc } from "../common/translations/localize";
import { computeStateDisplay } from "../common/entity/compute_state_display";

const DOMAINS_USE_LAST_UPDATED = ["climate", "water_heater"];
const LINE_ATTRIBUTES_TO_KEEP = [
  "temperature",
  "current_temperature",
  "target_temp_low",
  "target_temp_high",
  "hvac_action",
];

export interface LineChartState {
  state: string;
  last_changed: string;
  attributes?: { [key: string]: any };
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

export const fetchRecent = (
  hass,
  entityId,
  startTime,
  endTime,
  skipInitialState = false,
  includeLocation = false
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
  if (includeLocation) {
    url += "&include_location_attributes";
  }

  return hass.callApi("GET", url);
};

export const fetchDate = (
  hass: HomeAssistant,
  startTime: Date,
  endTime: Date
): Promise<HassEntity[][]> => {
  return hass.callApi(
    "GET",
    `history/period/${startTime.toISOString()}?end_time=${endTime.toISOString()}`
  );
};

const equalState = (obj1: LineChartState, obj2: LineChartState) =>
  obj1.state === obj2.state &&
  // They either both have an attributes object or not
  (!obj1.attributes ||
    LINE_ATTRIBUTES_TO_KEEP.every(
      (attr) => obj1.attributes![attr] === obj2.attributes![attr]
    ));

const processTimelineEntity = (
  localize: LocalizeFunc,
  language: string,
  states: HassEntity[]
): TimelineEntity => {
  const data: TimelineState[] = [];

  for (const state of states) {
    if (data.length > 0 && state.state === data[data.length - 1].state) {
      continue;
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
  localize: LocalizeFunc,
  language: string
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

    const stateWithUnit = stateInfo.find(
      (state) => "unit_of_measurement" in state.attributes
    );

    let unit: string | undefined;

    if (stateWithUnit) {
      unit = stateWithUnit.attributes.unit_of_measurement;
    } else if (computeStateDomain(stateInfo[0]) === "climate") {
      unit = hass.config.unit_system.temperature;
    } else if (computeStateDomain(stateInfo[0]) === "water_heater") {
      unit = hass.config.unit_system.temperature;
    }

    if (!unit) {
      timelineDevices.push(
        processTimelineEntity(localize, language, stateInfo)
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
