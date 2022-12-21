import { LocalizeFunc } from "../common/translations/localize";
import { HomeAssistant } from "../types";
import {
  computeHistory,
  HistoryStates,
  HistoryResult,
  LineChartUnit,
  TimelineEntity,
  entityIdHistoryNeedsAttributes,
  fetchRecentWS,
} from "./history";

export interface CacheConfig {
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

const stateHistoryCache: { [cacheKey: string]: CachedResults } = {};

// Cache type 2 functionality
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
  entityIds: string[],
  cacheConfig: CacheConfig,
  localize: LocalizeFunc,
  language: string
) => {
  const cacheKey = cacheConfig.cacheKey;
  const fullCacheKey = cacheKey + `_${cacheConfig.hoursToShow}`;
  const endTime = new Date();
  const startTime = new Date(endTime);
  startTime.setHours(startTime.getHours() - cacheConfig.hoursToShow);
  let toFetchStartTime = startTime;
  let appendingToCache = false;

  let cache = stateHistoryCache[fullCacheKey];
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
    cache = stateHistoryCache[fullCacheKey] = getEmptyCache(
      language,
      startTime,
      endTime
    );
  }

  const curCacheProm = cache.prom;
  const noAttributes = !entityIds.some((entityId) =>
    entityIdHistoryNeedsAttributes(hass, entityId)
  );

  const genProm = async () => {
    let fetchedHistory: HistoryStates;

    try {
      const results = await Promise.all([
        curCacheProm,
        fetchRecentWS(
          hass,
          entityIds,
          toFetchStartTime,
          endTime,
          appendingToCache,
          undefined,
          true,
          noAttributes
        ),
      ]);
      fetchedHistory = results[1];
    } catch (err: any) {
      delete stateHistoryCache[fullCacheKey];
      throw err;
    }
    const stateHistory = computeHistory(hass, fetchedHistory, localize);
    if (appendingToCache) {
      if (stateHistory.line.length) {
        mergeLine(stateHistory.line, cache.data.line);
      }
      if (stateHistory.timeline.length) {
        mergeTimeline(stateHistory.timeline, cache.data.timeline);
        // Replace the timeline array to force an update
        cache.data.timeline = [...cache.data.timeline];
      }
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

const mergeLine = (
  historyLines: LineChartUnit[],
  cacheLines: LineChartUnit[]
) => {
  historyLines.forEach((line) => {
    const unit = line.unit;
    const oldLine = cacheLines.find((cacheLine) => cacheLine.unit === unit);
    if (oldLine) {
      line.data.forEach((entity) => {
        const oldEntity = oldLine.data.find(
          (cacheEntity) => entity.entity_id === cacheEntity.entity_id
        );
        if (oldEntity) {
          oldEntity.states = oldEntity.states.concat(entity.states);
        } else {
          oldLine.data.push(entity);
        }
      });
      // Replace the cached line data to force an update
      oldLine.data = [...oldLine.data];
    } else {
      cacheLines.push(line);
    }
  });
};

const mergeTimeline = (
  historyTimelines: TimelineEntity[],
  cacheTimelines: TimelineEntity[]
) => {
  historyTimelines.forEach((timeline) => {
    const oldTimeline = cacheTimelines.find(
      (cacheTimeline) => cacheTimeline.entity_id === timeline.entity_id
    );
    if (oldTimeline) {
      oldTimeline.data = oldTimeline.data.concat(timeline.data);
    } else {
      cacheTimelines.push(timeline);
    }
  });
};

const pruneArray = (originalStartTime: Date, arr) => {
  if (arr.length === 0) {
    return arr;
  }
  const changedAfterStartTime = arr.findIndex(
    (state) => new Date(state.last_changed) > originalStartTime
  );
  if (changedAfterStartTime === 0) {
    // If all changes happened after originalStartTime then we are done.
    return arr;
  }

  // If all changes happened at or before originalStartTime. Use last index.
  const updateIndex =
    changedAfterStartTime === -1 ? arr.length - 1 : changedAfterStartTime - 1;
  arr[updateIndex].last_changed = originalStartTime;
  return arr.slice(updateIndex);
};

const pruneStartTime = (originalStartTime: Date, cacheData: HistoryResult) => {
  cacheData.line.forEach((line) => {
    line.data.forEach((entity) => {
      entity.states = pruneArray(originalStartTime, entity.states);
    });
  });

  cacheData.timeline.forEach((timeline) => {
    timeline.data = pruneArray(originalStartTime, timeline.data);
  });
};
