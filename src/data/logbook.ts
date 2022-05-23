import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { BINARY_STATE_OFF, BINARY_STATE_ON } from "../common/const";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { LocalizeFunc } from "../common/translations/localize";
import { HomeAssistant } from "../types";
import { UNAVAILABLE_STATES } from "./entity";

const LOGBOOK_LOCALIZE_PATH = "ui.components.logbook.messages";
export const CONTINUOUS_DOMAINS = ["proximity", "sensor"];

export interface LogbookEntry {
  // Python timestamp. Do *1000 to get JS timestamp.
  when: number;
  name: string;
  message?: string;
  entity_id?: string;
  icon?: string;
  source?: string;
  domain?: string;
  context_id?: string;
  context_user_id?: string;
  context_event_type?: string;
  context_domain?: string;
  context_service?: string;
  context_entity_id?: string;
  context_entity_id_name?: string;
  context_name?: string;
  context_message?: string;
  state?: string;
}

const DATA_CACHE: {
  [cacheKey: string]: { [entityId: string]: Promise<LogbookEntry[]> };
} = {};

export const getLogbookDataForContext = async (
  hass: HomeAssistant,
  startDate: string,
  contextId?: string
): Promise<LogbookEntry[]> => {
  const localize = await hass.loadBackendTranslation("device_class");
  return addLogbookMessage(
    hass,
    localize,
    await getLogbookDataFromServer(
      hass,
      startDate,
      undefined,
      undefined,
      contextId
    )
  );
};

export const getLogbookData = async (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityIds?: string[],
  deviceIds?: string[]
): Promise<LogbookEntry[]> => {
  const localize = await hass.loadBackendTranslation("device_class");
  return addLogbookMessage(
    hass,
    localize,
    // bypass cache if we have a device ID
    deviceIds?.length
      ? await getLogbookDataFromServer(
          hass,
          startDate,
          endDate,
          entityIds,
          undefined,
          deviceIds
        )
      : await getLogbookDataCache(hass, startDate, endDate, entityIds)
  );
};

const addLogbookMessage = (
  hass: HomeAssistant,
  localize: LocalizeFunc,
  logbookData: LogbookEntry[]
): LogbookEntry[] => {
  for (const entry of logbookData) {
    const stateObj = hass!.states[entry.entity_id!];
    if (entry.state && stateObj) {
      entry.message = getLogbookMessage(
        hass,
        localize,
        entry.state,
        stateObj,
        computeDomain(entry.entity_id!)
      );
    }
  }
  return logbookData;
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
  callbackFunction: (message: LogbookEntry[]) => void,
  startDate: string,
  entityIds?: string[],
  deviceIds?: string[]
): Promise<UnsubscribeFunc> => {
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
  };
  if (entityIds?.length) {
    params.entity_ids = entityIds;
  }
  if (deviceIds?.length) {
    params.device_ids = deviceIds;
  }
  return hass.connection.subscribeMessage<LogbookEntry[]>(
    (message?) => callbackFunction(message),
    params
  );
};

export const clearLogbookCache = (startDate: string, endDate: string) => {
  DATA_CACHE[`${startDate}${endDate}`] = {};
};

const getLogbookMessage = (
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
