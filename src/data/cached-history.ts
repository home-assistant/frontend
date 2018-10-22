import {
  computeHistory,
  fetchRecent,
  mergeLine,
  mergeTimeline,
  pruneStartTime,
  HistoryResult,
} from "./history";
import { HomeAssistant } from "../types";
import { LocalizeFunc } from "../mixins/localize-base-mixin";
import { HassEntity } from "home-assistant-js-websocket";

interface CacheConfig {
  refresh: number;
  cacheKey: string;
  hoursToShow: number;
}

interface CachedResults {
  prom: Promise<HistoryResult>;
  startTime: Date;
  endTime: Date;
  language: string;
  data: HistoryResult;
}

// This is a different interface, a different cache :(
interface RecentCacheResults {
  created: number;
  language: string;
  data: Promise<HistoryResult>;
}

const RECENT_THRESHOLD = 60000; // 1 minute
const RECENT_CACHE: { [cacheKey: string]: RecentCacheResults } = {};
const stateHistoryCache: { [cacheKey: string]: CachedResults } = {};

function getEmptyCache(
  language: string,
  startTime: Date,
  endTime: Date
): CachedResults {
  return {
    prom: Promise.resolve({ line: [], timeline: [] }),
    language,
    startTime,
    endTime,
    data: { line: [], timeline: [] },
  };
}

export const getRecentWithCache = (
  hass: HomeAssistant,
  entityId: string,
  cacheConfig: CacheConfig,
  localize: LocalizeFunc,
  language: string
) => {
  const cacheKey = cacheConfig.cacheKey;
  const endTime = new Date();
  const startTime = new Date(endTime);
  startTime.setHours(startTime.getHours() - cacheConfig.hoursToShow);
  let toFetchStartTime = startTime;
  let appendingToCache = false;

  let cache = stateHistoryCache[cacheKey];
  if (
    cache &&
    toFetchStartTime >= cache.startTime &&
    toFetchStartTime <= cache.endTime &&
    cache.language === language
  ) {
    toFetchStartTime = cache.endTime;
    appendingToCache = true;
    // This pretty much never happens as endTime is usually set to now
    if (endTime <= cache.endTime) {
      return cache.prom;
    }
  } else {
    cache = stateHistoryCache[cacheKey] = getEmptyCache(
      language,
      startTime,
      endTime
    );
  }

  const curCacheProm = cache.prom;

  const genProm = async () => {
    let fetchedHistory: HassEntity[][];

    try {
      const results = await Promise.all([
        curCacheProm,
        fetchRecent(
          hass,
          entityId,
          toFetchStartTime,
          endTime,
          appendingToCache
        ),
      ]);
      fetchedHistory = results[1];
    } catch (err) {
      delete stateHistoryCache[cacheKey];
      throw err;
    }
    const stateHistory = computeHistory(
      hass,
      fetchedHistory,
      localize,
      language
    );
    if (appendingToCache) {
      mergeLine(stateHistory.line, cache.data.line);
      mergeTimeline(stateHistory.timeline, cache.data.timeline);
      pruneStartTime(startTime, cache.data);
    } else {
      cache.data = stateHistory;
    }
    return cache.data;
  };

  cache.prom = genProm();
  cache.startTime = startTime;
  cache.endTime = endTime;
  return cache.prom;
};

export const getRecent = (
  hass: HomeAssistant,
  entityId: string,
  startTime: Date,
  endTime: Date,
  localize: LocalizeFunc,
  language: string
) => {
  const cacheKey = entityId;
  const cache = RECENT_CACHE[cacheKey];

  if (
    cache &&
    Date.now() - cache.created < RECENT_THRESHOLD &&
    cache.language === language
  ) {
    return cache.data;
  }

  const prom = fetchRecent(hass, entityId, startTime, endTime).then(
    (stateHistory) => computeHistory(hass, stateHistory, localize, language),
    (err) => {
      delete RECENT_CACHE[entityId];
      throw err;
    }
  );

  RECENT_CACHE[cacheKey] = {
    created: Date.now(),
    language,
    data: prom,
  };
  return prom;
};
