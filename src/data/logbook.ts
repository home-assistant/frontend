import { HomeAssistant } from "../types";

export interface LogbookEntry {
  when: string;
  name: string;
  message: string;
  entity_id?: string;
  domain: string;
  context_user_id?: string;
  context_entity_id?: string;
  context_entity_id_name?: string;
}

const DATA_CACHE: {
  [cacheKey: string]: { [entityId: string]: Promise<LogbookEntry[]> };
} = {};

export const getLogbookData = (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityId?: string
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
    return DATA_CACHE[cacheKey][ALL_ENTITIES].then((entities) =>
      entities.filter((entity) => entity.entity_id === entityId)
    );
  }

  DATA_CACHE[cacheKey][entityId] = getLogbookDataFromServer(
    hass,
    startDate,
    endDate,
    entityId !== ALL_ENTITIES ? entityId : undefined
  ).then((entries) => entries.reverse());
  return DATA_CACHE[cacheKey][entityId];
};

const getLogbookDataFromServer = async (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityId?: string
) => {
  const url = `logbook/${startDate}?end_time=${endDate}${
    entityId ? `&entity=${entityId}` : ""
  }`;
  return hass.callApi<LogbookEntry[]>("GET", url);
};

export const clearLogbookCache = (startDate, endDate) => {
  DATA_CACHE[`${startDate}${endDate}`] = {};
};
