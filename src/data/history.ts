import {
  HassConfig,
  HassEntities,
  HassEntity,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";
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
  "person",
  "device_tracker",
];
const LINE_ATTRIBUTES_TO_KEEP = [
  "temperature",
  "current_temperature",
  "target_temp_low",
  "target_temp_high",
  "hvac_action",
  "humidity",
  "mode",
  "action",
  "current_humidity",
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

export interface HistoryStates {
  [entityId: string]: EntityHistoryState[];
}

export interface EntityHistoryState {
  /** state */
  s: string;
  /** attributes */
  a: { [key: string]: any };
  /** last_changed; if set, also applies to lu */
  lc: number;
  /** last_updated */
  lu: number;
}

export interface HistoryStreamMessage {
  states: HistoryStates;
  start_time?: number; // Start time of this historical chunk
  end_time?: number; // End time of this historical chunk
}

export const entityIdHistoryNeedsAttributes = (
  hass: HomeAssistant,
  entityId: string
) =>
  !hass.states[entityId] ||
  NEED_ATTRIBUTE_DOMAINS.includes(computeDomain(entityId));

export const fetchDateWS = (
  hass: HomeAssistant,
  startTime: Date,
  endTime: Date,
  entityIds: string[]
) => {
  const params = {
    type: "history/history_during_period",
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    minimal_response: true,
    no_attributes: !entityIds.some((entityId) =>
      entityIdHistoryNeedsAttributes(hass, entityId)
    ),
  };
  if (entityIds.length !== 0) {
    return hass.callWS<HistoryStates>({ ...params, entity_ids: entityIds });
  }
  return hass.callWS<HistoryStates>(params);
};

export const subscribeHistory = (
  hass: HomeAssistant,
  callbackFunction: (data: HistoryStates) => void,
  startTime: Date,
  endTime: Date,
  entityIds: string[]
): Promise<() => Promise<void>> => {
  const params = {
    type: "history/stream",
    entity_ids: entityIds,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    minimal_response: true,
    no_attributes: !entityIds.some((entityId) =>
      entityIdHistoryNeedsAttributes(hass, entityId)
    ),
  };
  const stream = new HistoryStream(hass);
  return hass.connection.subscribeMessage<HistoryStreamMessage>(
    (message) => callbackFunction(stream.processMessage(message)),
    params
  );
};

class HistoryStream {
  hass: HomeAssistant;

  hoursToShow?: number;

  combinedHistory: HistoryStates;

  constructor(hass: HomeAssistant, hoursToShow?: number) {
    this.hass = hass;
    this.hoursToShow = hoursToShow;
    this.combinedHistory = {};
  }

  processMessage(streamMessage: HistoryStreamMessage): HistoryStates {
    if (!this.combinedHistory || !Object.keys(this.combinedHistory).length) {
      this.combinedHistory = streamMessage.states;
      return this.combinedHistory;
    }
    if (!Object.keys(streamMessage.states).length) {
      // Empty messages are still sent to
      // indicate no more historical events
      return this.combinedHistory;
    }
    const purgeBeforePythonTime = this.hoursToShow
      ? (new Date().getTime() - 60 * 60 * this.hoursToShow * 1000) / 1000
      : undefined;
    const newHistory: HistoryStates = {};
    for (const entityId of Object.keys(this.combinedHistory)) {
      newHistory[entityId] = [];
    }
    for (const entityId of Object.keys(streamMessage.states)) {
      newHistory[entityId] = [];
    }
    for (const entityId of Object.keys(newHistory)) {
      if (
        entityId in this.combinedHistory &&
        entityId in streamMessage.states
      ) {
        const entityCombinedHistory = this.combinedHistory[entityId];
        const lastEntityCombinedHistory =
          entityCombinedHistory[entityCombinedHistory.length - 1];
        newHistory[entityId] = entityCombinedHistory.concat(
          streamMessage.states[entityId]
        );
        if (
          streamMessage.states[entityId][0].lu < lastEntityCombinedHistory.lu
        ) {
          // If the history is out of order we have to sort it.
          newHistory[entityId] = newHistory[entityId].sort(
            (a, b) => a.lu - b.lu
          );
        }
      } else if (entityId in this.combinedHistory) {
        newHistory[entityId] = this.combinedHistory[entityId];
      } else {
        newHistory[entityId] = streamMessage.states[entityId];
      }
      // Remove old history
      if (purgeBeforePythonTime && entityId in this.combinedHistory) {
        const expiredStates = newHistory[entityId].filter(
          (state) => state.lu < purgeBeforePythonTime
        );
        if (!expiredStates.length) {
          continue;
        }
        newHistory[entityId] = newHistory[entityId].filter(
          (state) => state.lu >= purgeBeforePythonTime
        );
        if (
          newHistory[entityId].length &&
          newHistory[entityId][0].lu === purgeBeforePythonTime
        ) {
          continue;
        }
        // Update the first entry to the start time state
        // as we need to preserve the start time state and
        // only expire the rest of the history as it ages.
        const lastExpiredState = expiredStates[expiredStates.length - 1];
        lastExpiredState.lu = purgeBeforePythonTime;
        newHistory[entityId].unshift(lastExpiredState);
      }
    }
    this.combinedHistory = newHistory;
    return this.combinedHistory;
  }
}

export const subscribeHistoryStatesTimeWindow = (
  hass: HomeAssistant,
  callbackFunction: (data: HistoryStates) => void,
  hoursToShow: number,
  entityIds: string[],
  minimalResponse = true,
  significantChangesOnly = true,
  noAttributes?: boolean
): Promise<() => Promise<void>> => {
  const params = {
    type: "history/stream",
    entity_ids: entityIds,
    start_time: new Date(
      new Date().getTime() - 60 * 60 * hoursToShow * 1000
    ).toISOString(),
    minimal_response: minimalResponse,
    significant_changes_only: significantChangesOnly,
    no_attributes:
      noAttributes ??
      !entityIds.some((entityId) =>
        entityIdHistoryNeedsAttributes(hass, entityId)
      ),
  };
  const stream = new HistoryStream(hass, hoursToShow);
  return hass.connection.subscribeMessage<HistoryStreamMessage>(
    (message) => callbackFunction(stream.processMessage(message)),
    params
  );
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
  locale: FrontendLocaleData,
  config: HassConfig,
  entities: HomeAssistant["entities"],
  entityId: string,
  states: EntityHistoryState[],
  current_state: HassEntity | undefined
): TimelineEntity => {
  const data: TimelineState[] = [];
  const first: EntityHistoryState = states[0];
  for (const state of states) {
    if (data.length > 0 && state.s === data[data.length - 1].state) {
      continue;
    }

    const currentAttributes: HassEntityAttributeBase = {};
    if (current_state?.attributes.device_class) {
      currentAttributes.device_class = current_state?.attributes.device_class;
    }

    data.push({
      state_localize: computeStateDisplayFromEntityAttributes(
        localize,
        locale,
        config,
        entities[entityId],
        entityId,
        {
          ...(state.a || first.a),
          ...currentAttributes,
        },
        state.s
      ),
      state: state.s,
      // lc (last_changed) may be omitted if its the same
      // as lu (last_updated).
      last_changed: (state.lc ? state.lc : state.lu) * 1000,
    });
  }

  return {
    name: computeStateNameFromEntityAttributes(
      entityId,
      current_state?.attributes || first.a
    ),
    entity_id: entityId,
    data,
  };
};

const processLineChartEntities = (
  unit,
  entities: HistoryStates,
  hassEntities: HassEntities
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

    const attributes =
      entityId in hassEntities
        ? hassEntities[entityId].attributes
        : "friendly_name" in first.a
        ? first.a
        : undefined;

    data.push({
      domain,
      name: computeStateNameFromEntityAttributes(entityId, attributes || {}),
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

const NUMERICAL_DOMAINS = ["counter", "input_number", "number"];

const isNumericFromDomain = (domain: string) =>
  NUMERICAL_DOMAINS.includes(domain);

const isNumericFromAttributes = (attributes: { [key: string]: any }) =>
  "unit_of_measurement" in attributes || "state_class" in attributes;

const isNumericSensorEntity = (
  stateObj: HassEntity,
  sensorNumericalDeviceClasses: string[]
) =>
  stateObj.attributes.device_class != null &&
  sensorNumericalDeviceClasses.includes(stateObj.attributes.device_class);

const BLANK_UNIT = " ";

export const computeHistory = (
  hass: HomeAssistant,
  stateHistory: HistoryStates,
  localize: LocalizeFunc,
  sensorNumericalDeviceClasses: string[]
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

    const domain = computeDomain(entityId);

    const currentState =
      entityId in hass.states ? hass.states[entityId] : undefined;
    const numericStateFromHistory =
      currentState || isNumericFromDomain(domain)
        ? undefined
        : stateInfo.find(
            (state) => state.a && isNumericFromAttributes(state.a)
          );

    let unit: string | undefined;

    const isNumeric =
      isNumericFromDomain(domain) ||
      (currentState != null &&
        isNumericFromAttributes(currentState.attributes)) ||
      (currentState != null &&
        domain === "sensor" &&
        isNumericSensorEntity(currentState, sensorNumericalDeviceClasses)) ||
      numericStateFromHistory != null;

    if (isNumeric) {
      unit =
        currentState?.attributes.unit_of_measurement ||
        numericStateFromHistory?.a.unit_of_measurement ||
        BLANK_UNIT;
    } else {
      unit = {
        zone: localize("ui.dialogs.more_info_control.zone.graph_unit"),
        climate: hass.config.unit_system.temperature,
        humidifier: "%",
        water_heater: hass.config.unit_system.temperature,
      }[domain];
    }

    if (!unit) {
      timelineDevices.push(
        processTimelineEntity(
          localize,
          hass.locale,
          hass.config,
          hass.entities,
          entityId,
          stateInfo,
          currentState
        )
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
    processLineChartEntities(unit, lineChartDevices[unit], hass.states)
  );

  return { line: unitStates, timeline: timelineDevices };
};
