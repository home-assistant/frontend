import { PolymerElement } from '@polymer/polymer/polymer-element.js';

var DATE_CACHE = {};
var ALL_ENTITIES = '*';

class HaLogbookData extends PolymerElement {
  static get properties() {
    return {
      hass: {
        type: Object,
        observer: 'hassChanged',
      },

      filterDate: {
        type: String,
        observer: 'filterDateChanged',
      },

      filterEntity: {
        type: String,
        observer: 'filterEntityChanged',
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
      this.filterDateChanged(this.filterDate);
    }
  }

  filterEntityChanged(filterEntity) {
    if (filterEntity) {
      this.updateData(this.filterDate, filterEntity);
    } else {
      this.filterEntity = ALL_ENTITIES;
    }
  }

  filterDateChanged(filterDate) {
    this.updateData(filterDate, this.filterEntity);
  }

  updateData(filterDate, filterEntity) {
    if (!this.hass) return;

    this._setIsLoading(true);

    this.getDate(filterDate, filterEntity).then(function (logbookEntries) {
      this._setEntries(logbookEntries);
      this._setIsLoading(false);
    }.bind(this));
  }

  getDate(date, entityId) {
    if (!DATE_CACHE[date]) {
      DATE_CACHE[date] = [];
    }

    if (DATE_CACHE[date][entityId]) {
      return DATE_CACHE[date][entityId];
    }

    if (entityId !== ALL_ENTITIES && DATE_CACHE[date][ALL_ENTITIES]) {
      return DATE_CACHE[date][ALL_ENTITIES].then(function (entities) {
        return entities.filter(function (entity) {
          return entity.entity_id === entityId;
        });
      });
    }

    return DATE_CACHE[date][entityId] = this._getDate(date, entityId);
  }

  _getDate(date, entityId) {
    var url = 'logbook/' + date;
    if (entityId !== ALL_ENTITIES) {
      url += '/' + entityId;
    }

    return this.hass.callApi('GET', url).then(
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
    DATE_CACHE[this.filterDate] = [];
    this.updateData(this.filterDate, this.filterEntity);
  }
}

customElements.define('ha-logbook-data', HaLogbookData);
