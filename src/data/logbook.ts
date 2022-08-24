import { HassEntity } from "home-assistant-js-websocket";
import {
  BINARY_STATE_OFF,
  BINARY_STATE_ON,
  DOMAINS_WITH_DYNAMIC_PICTURE,
} from "../common/const";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { LocalizeFunc } from "../common/translations/localize";
import { HaEntityPickerEntityFilterFunc } from "../components/entity/ha-entity-picker";
import { HomeAssistant } from "../types";
import { UNAVAILABLE_STATES } from "./entity";

const LOGBOOK_LOCALIZE_PATH = "ui.components.logbook.messages";
export const CONTINUOUS_DOMAINS = ["counter", "proximity", "sensor", "zone"];

export interface LogbookStreamMessage {
  events: LogbookEntry[];
  start_time?: number; // Start time of this historical chunk
  end_time?: number; // End time of this historical chunk
  partial?: boolean; // Indiciates more historical chunks are coming
}

export interface LogbookEntry {
  // Base data
  when: number; // Python timestamp. Do *1000 to get JS timestamp.
  name: string;
  message?: string;
  entity_id?: string;
  icon?: string;
  source?: string; // The trigger source
  domain?: string;
  state?: string; // The state of the entity
  // Context data
  context_id?: string;
  context_user_id?: string;
  context_event_type?: string;
  context_domain?: string;
  context_service?: string; // Service calls only
  context_entity_id?: string;
  context_entity_id_name?: string; // Legacy, not longer sent
  context_name?: string;
  context_state?: string; // The state of the entity
  context_source?: string; // The trigger source
  context_message?: string;
}

//
// Localization mapping for all the triggers in core
// in homeassistant.components.homeassistant.triggers
//
const triggerPhrases = {
  "numeric state of": "triggered_by_numeric_state_of", // number state trigger
  "state of": "triggered_by_state_of", // state trigger
  event: "triggered_by_event", // event trigger
  time: "triggered_by_time", // time trigger
  "time pattern": "triggered_by_time_pattern", // time trigger
  "Home Assistant stopping": "triggered_by_homeassistant_stopping", // stop event
  "Home Assistant starting": "triggered_by_homeassistant_starting", // start event
};

const DATA_CACHE: {
  [cacheKey: string]: { [entityId: string]: Promise<LogbookEntry[]> };
} = {};

export const getLogbookDataForContext = async (
  hass: HomeAssistant,
  startDate: string,
  contextId?: string
): Promise<LogbookEntry[]> => {
  await hass.loadBackendTranslation("device_class");
  return getLogbookDataFromServer(
    hass,
    startDate,
    undefined,
    undefined,
    contextId
  );
};

export const getLogbookData = async (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityIds?: string[],
  deviceIds?: string[]
): Promise<LogbookEntry[]> => {
  await hass.loadBackendTranslation("device_class");
  return deviceIds?.length
    ? getLogbookDataFromServer(
        hass,
        startDate,
        endDate,
        entityIds,
        undefined,
        deviceIds
      )
    : getLogbookDataCache(hass, startDate, endDate, entityIds);
};

const getLogbookDataCache = async (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityId?: string[]
) => {
  const ALL_ENTITIES = "*";

  const entityIdKey = entityId ? entityId.toString() : ALL_ENTITIES;
  const cacheKey = `${startDate}${endDate}`;

  if (!DATA_CACHE[cacheKey]) {
    DATA_CACHE[cacheKey] = {};
  }

  if (entityIdKey in DATA_CACHE[cacheKey]) {
    return DATA_CACHE[cacheKey][entityIdKey];
  }

  if (entityId && DATA_CACHE[cacheKey][ALL_ENTITIES]) {
    const entities = await DATA_CACHE[cacheKey][ALL_ENTITIES];
    return entities.filter(
      (entity) => entity.entity_id && entityId.includes(entity.entity_id)
    );
  }

  DATA_CACHE[cacheKey][entityIdKey] = getLogbookDataFromServer(
    hass,
    startDate,
    endDate,
    entityId
  );
  return DATA_CACHE[cacheKey][entityIdKey];
};

const getLogbookDataFromServer = (
  hass: HomeAssistant,
  startDate: string,
  endDate?: string,
  entityIds?: string[],
  contextId?: string,
  deviceIds?: string[]
): Promise<LogbookEntry[]> => {
  // If all specified filters are empty lists, we can return an empty list.
  if (
    (entityIds || deviceIds) &&
    (!entityIds || entityIds.length === 0) &&
    (!deviceIds || deviceIds.length === 0)
  ) {
    return Promise.resolve([]);
  }

  const params: any = {
    type: "logbook/get_events",
    start_time: startDate,
  };
  if (endDate) {
    params.end_time = endDate;
  }
  if (entityIds?.length) {
    params.entity_ids = entityIds;
  }
  if (deviceIds?.length) {
    params.device_ids = deviceIds;
  }
  if (contextId) {
    params.context_id = contextId;
  }
  return hass.callWS<LogbookEntry[]>(params);
};

export const subscribeLogbook = (
  hass: HomeAssistant,
  callbackFunction: (message: LogbookStreamMessage) => void,
  startDate: string,
  endDate: string,
  entityIds?: string[],
  deviceIds?: string[]
): Promise<() => Promise<void>> => {
  // If all specified filters are empty lists, we can return an empty list.
  if (
    (entityIds || deviceIds) &&
    (!entityIds || entityIds.length === 0) &&
    (!deviceIds || deviceIds.length === 0)
  ) {
    return Promise.reject("No entities or devices");
  }
  const params: any = {
    type: "logbook/event_stream",
    start_time: startDate,
    end_time: endDate,
  };
  if (entityIds?.length) {
    params.entity_ids = entityIds;
  }
  if (deviceIds?.length) {
    params.device_ids = deviceIds;
  }
  return hass.connection.subscribeMessage<LogbookStreamMessage>(
    (message) => callbackFunction(message),
    params
  );
};

export const clearLogbookCache = (startDate: string, endDate: string) => {
  DATA_CACHE[`${startDate}${endDate}`] = {};
};

export const createHistoricState = (
  currentStateObj: HassEntity,
  state?: string
): HassEntity => <HassEntity>(<unknown>{
    entity_id: currentStateObj.entity_id,
    state: state,
    attributes: {
      // Rebuild the historical state by copying static attributes only
      device_class: currentStateObj?.attributes.device_class,
      source_type: currentStateObj?.attributes.source_type,
      has_date: currentStateObj?.attributes.has_date,
      has_time: currentStateObj?.attributes.has_time,
      // We do not want to use dynamic entity pictures (e.g., from media player) for the log book rendering,
      // as they would present a false state in the log (played media right now vs actual historic data).
      entity_picture_local: DOMAINS_WITH_DYNAMIC_PICTURE.has(
        computeDomain(currentStateObj.entity_id)
      )
        ? undefined
        : currentStateObj?.attributes.entity_picture_local,
      entity_picture: DOMAINS_WITH_DYNAMIC_PICTURE.has(
        computeDomain(currentStateObj.entity_id)
      )
        ? undefined
        : currentStateObj?.attributes.entity_picture,
    },
  });

export const localizeTriggerSource = (
  localize: LocalizeFunc,
  source: string
) => {
  for (const triggerPhrase in triggerPhrases) {
    if (source.startsWith(triggerPhrase)) {
      return source.replace(
        triggerPhrase,
        `${localize(`ui.components.logbook.${triggerPhrases[triggerPhrase]}`)}`
      );
    }
  }
  return source;
};

export const localizeStateMessage = (
  hass: HomeAssistant,
  localize: LocalizeFunc,
  state: string,
  stateObj: HassEntity,
  domain: string
): string => {
  switch (domain) {
    case "device_tracker":
    case "person":
      if (state === "not_home") {
        return localize(`${LOGBOOK_LOCALIZE_PATH}.was_away`);
      }
      if (state === "home") {
        return localize(`${LOGBOOK_LOCALIZE_PATH}.was_at_home`);
      }
      return localize(`${LOGBOOK_LOCALIZE_PATH}.was_at_state`, "state", state);

    case "sun":
      return state === "above_horizon"
        ? localize(`${LOGBOOK_LOCALIZE_PATH}.rose`)
        : localize(`${LOGBOOK_LOCALIZE_PATH}.set`);

    case "binary_sensor": {
      const isOn = state === BINARY_STATE_ON;
      const isOff = state === BINARY_STATE_OFF;
      const device_class = stateObj.attributes.device_class;

      switch (device_class) {
        case "battery":
          if (isOn) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_low`);
          }
          if (isOff) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_normal`);
          }
          break;

        case "connectivity":
          if (isOn) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_connected`);
          }
          if (isOff) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_disconnected`);
          }
          break;

        case "door":
        case "garage_door":
        case "opening":
        case "window":
          if (isOn) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_opened`);
          }
          if (isOff) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_closed`);
          }
          break;

        case "lock":
          if (isOn) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_unlocked`);
          }
          if (isOff) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_locked`);
          }
          break;

        case "plug":
          if (isOn) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_plugged_in`);
          }
          if (isOff) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_unplugged`);
          }
          break;

        case "presence":
          if (isOn) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_at_home`);
          }
          if (isOff) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_away`);
          }
          break;

        case "safety":
          if (isOn) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_unsafe`);
          }
          if (isOff) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.was_safe`);
          }
          break;

        case "cold":
        case "gas":
        case "heat":
        case "moisture":
        case "motion":
        case "occupancy":
        case "power":
        case "problem":
        case "smoke":
        case "sound":
        case "vibration":
          if (isOn) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.detected_device_class`, {
              device_class: localize(
                `component.binary_sensor.device_class.${device_class}`
              ),
            });
          }
          if (isOff) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.cleared_device_class`, {
              device_class: localize(
                `component.binary_sensor.device_class.${device_class}`
              ),
            });
          }
          break;

        case "tamper":
          if (isOn) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.detected_tampering`);
          }
          if (isOff) {
            return localize(`${LOGBOOK_LOCALIZE_PATH}.cleared_tampering`);
          }
          break;
      }

      break;
    }

    case "cover":
      switch (state) {
        case "open":
          return localize(`${LOGBOOK_LOCALIZE_PATH}.was_opened`);
        case "opening":
          return localize(`${LOGBOOK_LOCALIZE_PATH}.is_opening`);
        case "closing":
          return localize(`${LOGBOOK_LOCALIZE_PATH}.is_closing`);
        case "closed":
          return localize(`${LOGBOOK_LOCALIZE_PATH}.was_closed`);
      }
      break;

    case "lock":
      if (state === "unlocked") {
        return localize(`${LOGBOOK_LOCALIZE_PATH}.was_unlocked`);
      }
      if (state === "locked") {
        return localize(`${LOGBOOK_LOCALIZE_PATH}.was_locked`);
      }
      break;
  }

  if (state === BINARY_STATE_ON) {
    return localize(`${LOGBOOK_LOCALIZE_PATH}.turned_on`);
  }

  if (state === BINARY_STATE_OFF) {
    return localize(`${LOGBOOK_LOCALIZE_PATH}.turned_off`);
  }

  if (UNAVAILABLE_STATES.includes(state)) {
    return localize(`${LOGBOOK_LOCALIZE_PATH}.became_unavailable`);
  }

  return hass.localize(
    `${LOGBOOK_LOCALIZE_PATH}.changed_to_state`,
    "state",
    stateObj
      ? computeStateDisplay(localize, stateObj, hass.locale, state)
      : state
  );
};

export const filterLogbookCompatibleEntities: HaEntityPickerEntityFilterFunc = (
  entity
) =>
  computeStateDomain(entity) !== "sensor" ||
  (entity.attributes.unit_of_measurement === undefined &&
    entity.attributes.state_class === undefined);
