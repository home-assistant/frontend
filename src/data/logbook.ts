import { HassEntity } from "home-assistant-js-websocket";
import { BINARY_STATE_OFF, BINARY_STATE_ON } from "../common/const";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { HomeAssistant } from "../types";
import { UNAVAILABLE_STATES } from "./entity";

const LOGBOOK_LOCALIZE_PATH = "ui.components.logbook.messages";

export interface LogbookEntry {
  when: string;
  name: string;
  message?: string;
  entity_id?: string;
  icon?: string;
  domain: string;
  context_user_id?: string;
  context_event_type?: string;
  context_domain?: string;
  context_service?: string;
  context_entity_id?: string;
  context_entity_id_name?: string;
  context_name?: string;
  state?: string;
}

const DATA_CACHE: {
  [cacheKey: string]: { [entityId: string]: Promise<LogbookEntry[]> };
} = {};

export const getLogbookData = async (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityId?: string,
  entity_matches_only?: boolean
) => {
  const logbookData = await getLogbookDataCache(
    hass,
    startDate,
    endDate,
    entityId,
    entity_matches_only
  );

  for (const entry of logbookData) {
    const stateObj = hass!.states[entry.entity_id!];
    if (entry.state && stateObj) {
      entry.message = getLogbookMessage(
        hass,
        entry.state,
        stateObj,
        computeDomain(entry.entity_id!)
      );
    }
  }

  return logbookData;
};

export const getLogbookDataCache = async (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityId?: string,
  entity_matches_only?: boolean
) => {
  const ALL_ENTITIES = "*";

  if (!entityId) {
    entityId = ALL_ENTITIES;
  }

  const cacheKey = `${startDate}${endDate}`;

  if (!DATA_CACHE[cacheKey]) {
    DATA_CACHE[cacheKey] = {};
  }

  if (DATA_CACHE[cacheKey][entityId]) {
    return DATA_CACHE[cacheKey][entityId];
  }

  if (entityId !== ALL_ENTITIES && DATA_CACHE[cacheKey][ALL_ENTITIES]) {
    const entities = await DATA_CACHE[cacheKey][ALL_ENTITIES];
    return entities.filter((entity) => entity.entity_id === entityId);
  }

  DATA_CACHE[cacheKey][entityId] = getLogbookDataFromServer(
    hass,
    startDate,
    endDate,
    entityId !== ALL_ENTITIES ? entityId : undefined,
    entity_matches_only
  ).then((entries) => entries.reverse());
  return DATA_CACHE[cacheKey][entityId];
};

const getLogbookDataFromServer = async (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityId?: string,
  entity_matches_only?: boolean
) => {
  const url = `logbook/${startDate}?end_time=${endDate}${
    entityId ? `&entity=${entityId}` : ""
  }${entity_matches_only ? `&entity_matches_only` : ""}`;

  return hass.callApi<LogbookEntry[]>("GET", url);
};

export const clearLogbookCache = (startDate: string, endDate: string) => {
  DATA_CACHE[`${startDate}${endDate}`] = {};
};

export const getLogbookMessage = (
  hass: HomeAssistant,
  state: string,
  stateObj: HassEntity,
  domain: string
): string => {
  switch (domain) {
    case "device_tracker":
    case "person":
      return state === "not_home"
        ? hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_away`)
        : hass.localize(
            `${LOGBOOK_LOCALIZE_PATH}.was_at_state`,
            "state",
            state
          );

    case "sun":
      return state === "above_horizon"
        ? hass.localize(`${LOGBOOK_LOCALIZE_PATH}.rose`)
        : hass.localize(`${LOGBOOK_LOCALIZE_PATH}.set`);

    case "binary_sensor": {
      const isOn = state === BINARY_STATE_ON;
      const isOff = state === BINARY_STATE_OFF;
      const device_class = stateObj.attributes.device_class;

      switch (device_class) {
        case "battery":
          if (isOn) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_low`);
          }
          if (isOff) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_normal`);
          }
          break;

        case "connectivity":
          if (isOn) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_connected`);
          }
          if (isOff) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_disconnected`);
          }
          break;

        case "door":
        case "garage_door":
        case "opening":
        case "window":
          if (isOn) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_opened`);
          }
          if (isOff) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_closed`);
          }
          break;

        case "lock":
          if (isOn) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_unlocked`);
          }
          if (isOff) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_locked`);
          }
          break;

        case "plug":
          if (isOn) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_plugged_in`);
          }
          if (isOff) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_unplugged`);
          }
          break;

        case "presence":
          if (isOn) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_at_home`);
          }
          if (isOff) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_away`);
          }
          break;

        case "safety":
          if (isOn) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_unsafe`);
          }
          if (isOff) {
            return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_safe`);
          }
          break;

        case "cold":
        case "gas":
        case "heat":
        case "colightld":
        case "moisture":
        case "motion":
        case "occupancy":
        case "power":
        case "problem":
        case "smoke":
        case "sound":
        case "vibration":
          if (isOn) {
            return hass.localize(
              `${LOGBOOK_LOCALIZE_PATH}.detected_device_class`,
              "device_class",
              device_class
            );
          }
          if (isOff) {
            return hass.localize(
              `${LOGBOOK_LOCALIZE_PATH}.cleared_device_class`,
              "device_class",
              device_class
            );
          }
          break;
      }

      break;
    }

    case "cover":
      return state === "open"
        ? hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_opened`)
        : hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_closed`);

    case "lock":
      if (state === "unlocked") {
        return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_unlocked`);
      }
      if (state === "locked") {
        return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.was_locked`);
      }
      break;
  }

  if (state === BINARY_STATE_ON) {
    return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.turned_on`);
  }

  if (state === BINARY_STATE_OFF) {
    return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.turned_off`);
  }

  if (UNAVAILABLE_STATES.includes(state)) {
    return hass.localize(`${LOGBOOK_LOCALIZE_PATH}.became_unavailable`);
  }

  return hass.localize(
    `${LOGBOOK_LOCALIZE_PATH}.changed_to_state`,
    "state",
    stateObj
      ? computeStateDisplay(hass.localize, stateObj, hass.language, state)
      : state
  );
};
