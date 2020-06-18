import { HomeAssistant } from "../types";

export interface LogbookEntry {
  when: string;
  name: string;
  message: string;
  entity_id?: string;
  domain: string;
  context_user_id?: string;
}

const DATA_CACHE = {};
const ALL_ENTITIES = "*";

export const getLogbookData = (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityId?: string
) => {
  if (!entityId) entityId = ALL_ENTITIES;

  if (!DATA_CACHE[startDate]) DATA_CACHE[startDate] = [];
  if (!DATA_CACHE[startDate][endDate]) DATA_CACHE[startDate][endDate] = [];

  if (DATA_CACHE[startDate][endDate][entityId]) {
    return DATA_CACHE[startDate][endDate][entityId];
  }

  if (
    entityId !== ALL_ENTITIES &&
    DATA_CACHE[startDate][endDate][ALL_ENTITIES]
  ) {
    return DATA_CACHE[startDate][endDate][ALL_ENTITIES].then(function (
      entities
    ) {
      return entities.filter(function (entity) {
        return entity.entity_id === entityId;
      });
    });
  }

  DATA_CACHE[startDate][endDate][entityId] = _getLogbookDataFromServer(
    hass,
    startDate,
    endDate,
    entityId
  );
  return DATA_CACHE[startDate][endDate][entityId];
};

const _getLogbookDataFromServer = async (
  hass: HomeAssistant,
  startDate: string,
  endDate: string,
  entityId?: string
) => {
  let url = "logbook/" + startDate + "?end_time=" + endDate;
  if (entityId !== ALL_ENTITIES) {
    url += "&entity=" + entityId;
  }

  const entries = await hass.callApi<LogbookEntry[]>("GET", url);
  return entries.reverse();
};

export const clearLogbookCache = (startDate, endDate) => {
  DATA_CACHE[startDate][endDate] = [];
};
