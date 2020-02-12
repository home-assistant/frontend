import { PolymerElement } from "@polymer/polymer/polymer-element";

const DATA_CACHE = {};
const ALL_ENTITIES = "*";

class HaLogbookData extends PolymerElement {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "hassChanged",
      },

      filterDate: {
        type: String,
        observer: "filterDataChanged",
      },

      filterPeriod: {
        type: Number,
        observer: "filterDataChanged",
      },

      filterEntity: {
        type: String,
        observer: "filterDataChanged",
      },

      isLoading: {
        type: Boolean,
        value: true,
        readOnly: true,
        notify: true,
      },

      entries: {
        type: Object,
        value: null,
        readOnly: true,
        notify: true,
      },
    };
  }

  hassChanged(newHass, oldHass) {
    if (!oldHass && this.filterDate) {
      this.updateData();
    }
  }

  filterDataChanged(newValue, oldValue) {
    if (oldValue !== undefined) {
      this.updateData();
    }
  }

  updateData() {
    if (!this.hass) return;

    this._setIsLoading(true);

    this.getData(this.filterDate, this.filterPeriod, this.filterEntity).then(
      (logbookEntries) => {
        this._setEntries(logbookEntries);
        this._setIsLoading(false);
      }
    );
  }

  getData(date, period, entityId) {
    if (!entityId) entityId = ALL_ENTITIES;

    if (!DATA_CACHE[period]) DATA_CACHE[period] = [];
    if (!DATA_CACHE[period][date]) DATA_CACHE[period][date] = [];

    if (DATA_CACHE[period][date][entityId]) {
      return DATA_CACHE[period][date][entityId];
    }

    if (entityId !== ALL_ENTITIES && DATA_CACHE[period][date][ALL_ENTITIES]) {
      return DATA_CACHE[period][date][ALL_ENTITIES].then(function(entities) {
        return entities.filter(function(entity) {
          return entity.entity_id === entityId;
        });
      });
    }

    DATA_CACHE[period][date][entityId] = this._getFromServer(
      date,
      period,
      entityId
    );
    return DATA_CACHE[period][date][entityId];
  }

  _getFromServer(date, period, entityId) {
    let url = "logbook/" + date + "?period=" + period;
    if (entityId !== ALL_ENTITIES) {
      url += "&entity=" + entityId;
    }

    return this.hass.callApi("GET", url).then(
      function(logbookEntries) {
        logbookEntries.reverse();
        return logbookEntries;
      },
      function() {
        return null;
      }
    );
  }

  refreshLogbook() {
    DATA_CACHE[this.filterPeriod][this.filterDate] = [];
    this.updateData();
  }
}

customElements.define("ha-logbook-data", HaLogbookData);
