import { timeOut } from "@polymer/polymer/lib/utils/async";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import LocalizeMixin from "../mixins/localize-mixin";

import { computeHistory, fetchDate } from "./history";
import { getRecent, getRecentWithCache } from "./cached-history";

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
        data = getRecent(
          this.hass,
          entityId,
          startTime,
          endTime,
          localize,
          language
        );
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
        getRecentWithCache(
          this.hass,
          entityId,
          cacheConfig,
          localize,
          language
        ).then((stateHistory) => {
          this._setData({ ...stateHistory });
        });
      }, cacheConfig.refresh * 1000);
    }
    return getRecentWithCache(
      this.hass,
      entityId,
      cacheConfig,
      localize,
      language
    );
  }
}
customElements.define("ha-state-history-data", HaStateHistoryData);
