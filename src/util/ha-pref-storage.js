import { PolymerElement } from '@polymer/polymer/polymer-element.js';

{
  const STORED_STATE = [
    'dockedSidebar',
    'selectedTheme',
    'selectedLanguage',
  ];

  class HaPrefStorage extends PolymerElement {
    static get is() { return 'ha-pref-storage'; }

    static get properties() {
      return {
        hass: Object,
        storage: {
          type: Object,
          value: window.localStorage || {},
        },
      };
    }

    storeState() {
      if (!this.hass) return;

      try {
        for (var i = 0; i < STORED_STATE.length; i++) {
          var key = STORED_STATE[i];
          var value = this.hass[key];
          this.storage[key] = JSON.stringify(value === undefined ? null : value);
        }
      } catch (err) {
        // Safari throws exception in private mode
      }
    }

    getStoredState() {
      var state = {};

      for (var i = 0; i < STORED_STATE.length; i++) {
        var key = STORED_STATE[i];
        if (key in this.storage) {
          state[key] = JSON.parse(this.storage[key]);
        }
      }

      return state;
    }
  }
  customElements.define(HaPrefStorage.is, HaPrefStorage);
}
