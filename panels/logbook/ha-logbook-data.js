import { PolymerElement } from '@polymer/polymer/polymer-element.js';
{
  var DATE_CACHE = {};

  class HaLogbookData extends PolymerElement {
    static get is() { return 'ha-logbook-data'; }

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

    filterDateChanged(filterDate) {
      if (!this.hass) return;

      this._setIsLoading(true);

      this.getDate(filterDate).then(function (logbookEntries) {
        this._setEntries(logbookEntries);
        this._setIsLoading(false);
      }.bind(this));
    }

    getDate(date) {
      if (!DATE_CACHE[date]) {
        DATE_CACHE[date] = this.hass.callApi('GET', 'logbook/' + date).then(
          function (logbookEntries) {
            logbookEntries.reverse();
            return logbookEntries;
          },
          function () {
            DATE_CACHE[date] = false;
            return null;
          }
        );
      }

      return DATE_CACHE[date];
    }

    refreshLogbook() {
      DATE_CACHE[this.filterDate] = null;
      this.filterDateChanged(this.filterDate);
    }
  }

  customElements.define(HaLogbookData.is, HaLogbookData);
}
