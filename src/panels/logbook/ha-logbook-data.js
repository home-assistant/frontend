/* eslint-plugin-disable lit */
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

      filterStartDate: {
        type: String,
        observer: "filterDataChanged",
      },

      filterEndDate: {
        type: String,
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
    if (!oldHass && this.filterStartDate) {
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

    this.getData(
      this.filterStartDate,
      this.filterEndDate,
      this.filterEntity
    ).then((logbookEntries) => {
      this._setEntries(logbookEntries);
      this._setIsLoading(false);
    });
  }

  getData(startDate, endDate, entityId) {
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

    DATA_CACHE[startDate][endDate][entityId] = this._getFromServer(
      startDate,
      endDate,
      entityId
    );
    return DATA_CACHE[startDate][endDate][entityId];
  }

  _getFromServer(startDate, endDate, entityId) {
    let url = "logbook/" + startDate + "?end_time=" + endDate;
    if (entityId !== ALL_ENTITIES) {
      url += "&entity=" + entityId;
    }

    return this.hass.callApi("GET", url).then(
      function (logbookEntries) {
        logbookEntries.reverse();
        return logbookEntries;
      },
      function () {
        return null;
      }
    );
  }

  refreshLogbook() {
    DATA_CACHE[this.filterStartDate][this.filterEndDate] = [];
    this.updateData();
  }
}

customElements.define("ha-logbook-data", HaLogbookData);
