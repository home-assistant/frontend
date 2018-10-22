import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import LocalizeMixin from "../mixins/localize-mixin.js";

import {
  computeHistory,
  fetchRecent,
  fetchDate,
  mergeLine,
  mergeTimeline,
  pruneStartTime,
} from "./history";

const RECENT_THRESHOLD = 60000; // 1 minute
const RECENT_CACHE = {};
const stateHistoryCache = {};

function getEmptyCache(language) {
  return {
    prom: Promise.resolve({ line: [], timeline: [] }),
    language: language,
    data: { line: [], timeline: [] },
  };
}

/*
 * @appliesMixin LocalizeMixin
 */
class HaStateHistoryData extends LocalizeMixin(PolymerElement) {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "hassChanged",
      },

      filterType: String,

      cacheConfig: Object,

      startTime: Date,
      endTime: Date,

      entityId: String,

      isLoading: {
        type: Boolean,
        value: true,
        readOnly: true,
        notify: true,
      },

      data: {
        type: Object,
        value: null,
        readOnly: true,
        notify: true,
      },
    };
  }

  static get observers() {
    return [
      "filterChangedDebouncer(filterType, entityId, startTime, endTime, cacheConfig, localize)",
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this.filterChangedDebouncer(
      this.filterType,
      this.entityId,
      this.startTime,
      this.endTime,
      this.cacheConfig,
      this.localize
    );
  }

  disconnectedCallback() {
    if (this._refreshTimeoutId) {
      window.clearInterval(this._refreshTimeoutId);
      this._refreshTimeoutId = null;
    }
    super.disconnectedCallback();
  }

  hassChanged(newHass, oldHass) {
    if (!oldHass && !this._madeFirstCall) {
      this.filterChangedDebouncer(
        this.filterType,
        this.entityId,
        this.startTime,
        this.endTime,
        this.cacheConfig,
        this.localize
      );
    }
  }

  filterChangedDebouncer(...args) {
    this._debounceFilterChanged = Debouncer.debounce(
      this._debounceFilterChanged,
      timeOut.after(0),
      () => {
        this.filterChanged(...args);
      }
    );
  }

  filterChanged(
    filterType,
    entityId,
    startTime,
    endTime,
    cacheConfig,
    localize
  ) {
    if (!this.hass) {
      return;
    }
    if (cacheConfig && !cacheConfig.cacheKey) {
      return;
    }
    if (!localize) {
      return;
    }
    this._madeFirstCall = true;
    const language = this.hass.language;
    let data;

    if (filterType === "date") {
      if (!startTime || !endTime) return;

      data = fetchDate(this.hass, startTime, endTime).then((dateHistory) =>
        computeHistory(this.hass, dateHistory, localize, language)
      );
    } else if (filterType === "recent-entity") {
      if (!entityId) return;
      if (cacheConfig) {
        data = this.getRecentWithCacheRefresh(
          entityId,
          cacheConfig,
          localize,
          language
        );
      } else {
        data = this.getRecent(entityId, startTime, endTime, localize, language);
      }
    } else {
      return;
    }
    this._setIsLoading(true);

    data.then((stateHistory) => {
      this._setData(stateHistory);
      this._setIsLoading(false);
    });
  }

  getRecentWithCacheRefresh(entityId, cacheConfig, localize, language) {
    if (this._refreshTimeoutId) {
      window.clearInterval(this._refreshTimeoutId);
      this._refreshTimeoutId = null;
    }
    if (cacheConfig.refresh) {
      this._refreshTimeoutId = window.setInterval(() => {
        this.getRecentWithCache(entityId, cacheConfig, localize, language).then(
          (stateHistory) => {
            this._setData(Object.assign({}, stateHistory));
          }
        );
      }, cacheConfig.refresh * 1000);
    }
    return this.getRecentWithCache(entityId, cacheConfig, localize, language);
  }

  getRecentWithCache(entityId, cacheConfig, localize, language) {
    const cacheKey = cacheConfig.cacheKey;
    const endTime = new Date();
    const originalStartTime = new Date(endTime);
    originalStartTime.setHours(
      originalStartTime.getHours() - cacheConfig.hoursToShow
    );
    let startTime = originalStartTime;
    let appendingToCache = false;
    let cache = stateHistoryCache[cacheKey];
    if (
      cache &&
      startTime >= cache.startTime &&
      startTime <= cache.endTime &&
      cache.language === language
    ) {
      startTime = cache.endTime;
      appendingToCache = true;
      if (endTime <= cache.endTime) {
        return cache.prom;
      }
    } else {
      cache = stateHistoryCache[cacheKey] = getEmptyCache(language);
    }
    // Use Promise.all in order to make sure the old and the new fetches have both completed.
    const prom = Promise.all([
      cache.prom,
      fetchRecent(this.hass, entityId, startTime, endTime, appendingToCache),
    ])
      // Use only data from the new fetch. Old fetch is already stored in cache.data
      .then((oldAndNew) => oldAndNew[1])
      // Convert data into format state-history-chart-* understands.
      .then((stateHistory) =>
        computeHistory(this.hass, stateHistory, localize, language)
      )
      // Merge old and new.
      .then((stateHistory) => {
        mergeLine(stateHistory.line, cache.data.line);
        mergeTimeline(stateHistory.timeline, cache.data.timeline);
        if (appendingToCache) {
          pruneStartTime(originalStartTime, cache.data);
        }
        return cache.data;
      })
      .catch((err) => {
        /* eslint-disable no-console */
        console.error(err);
        stateHistoryCache[cacheKey] = undefined;
      });
    cache.prom = prom;
    cache.startTime = originalStartTime;
    cache.endTime = endTime;
    return prom;
  }

  getRecent(entityId, startTime, endTime, localize, language) {
    const cacheKey = entityId;
    const cache = RECENT_CACHE[cacheKey];

    if (
      cache &&
      Date.now() - cache.created < RECENT_THRESHOLD &&
      cache.language === language
    ) {
      return cache.data;
    }

    const prom = fetchRecent(this.hass, entityId, startTime, endTime).then(
      (stateHistory) =>
        computeHistory(this.hass, stateHistory, localize, language),
      () => {
        RECENT_CACHE[entityId] = false;
        return null;
      }
    );

    RECENT_CACHE[cacheKey] = {
      created: Date.now(),
      language: language,
      data: prom,
    };
    return prom;
  }
}
customElements.define("ha-state-history-data", HaStateHistoryData);
