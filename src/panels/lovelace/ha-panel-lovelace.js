import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-button/paper-button";

import "../../layouts/hass-loading-screen";
import "../../layouts/hass-error-screen";
import "./hui-root";

class Lovelace extends PolymerElement {
  static get template() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
        }
      </style>
      <template is='dom-if' if='[[_equal(_state, "loaded")]]' restamp>
        <hui-root
          narrow="[[narrow]]"
          show-menu="[[showMenu]]"
          hass='[[hass]]'
          route="[[route]]"
          config='[[_config]]'
          columns='[[_columns]]'
          on-config-refresh='_fetchConfig'
        ></hui-root>
      </template>
      <template is='dom-if' if='[[_equal(_state, "loading")]]' restamp>
        <hass-loading-screen
          narrow="[[narrow]]"
          show-menu="[[showMenu]]"
        ></hass-loading-screen>
      </template>
      <template is='dom-if' if='[[_equal(_state, "error")]]' restamp>
        <hass-error-screen
          title='Lovelace'
          error='[[_errorMsg]]'
          narrow="[[narrow]]"
          show-menu="[[showMenu]]"
        >
          <paper-button on-click="_fetchConfig">Reload ui-lovelace.yaml</paper-button>
        </hass-error-screen>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,

      narrow: {
        type: Boolean,
        value: false,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      route: Object,

      _columns: {
        type: Number,
        value: 1,
      },

      _state: {
        type: String,
        value: "loading",
      },

      _errorMsg: String,

      _config: {
        type: Object,
        value: null,
      },
    };
  }

  static get observers() {
    return ["_updateColumns(narrow, showMenu)"];
  }

  ready() {
    this._fetchConfig();
    this._updateColumns = this._updateColumns.bind(this);
    this.mqls = [300, 600, 900, 1200].map((width) => {
      const mql = matchMedia(`(min-width: ${width}px)`);
      mql.addListener(this._updateColumns);
      return mql;
    });
    this._updateColumns();
    super.ready();
  }

  _updateColumns() {
    const matchColumns = this.mqls.reduce((cols, mql) => cols + mql.matches, 0);
    // Do -1 column if the menu is docked and open
    this._columns = Math.max(1, matchColumns - (!this.narrow && this.showMenu));
  }

  async _fetchConfig() {
    try {
      const conf = await this.hass.callWS({ type: "lovelace/config" });
      this.setProperties({
        _config: conf,
        _state: "loaded",
      });
    } catch (err) {
      this.setProperties({
        _state: "error",
        _errorMsg: err.message,
      });
    }
  }

  _equal(a, b) {
    return a === b;
  }
}

customElements.define("ha-panel-lovelace", Lovelace);
