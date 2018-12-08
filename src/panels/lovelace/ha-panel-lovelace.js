import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/paper-button/paper-button";

import { registerSaveDialog } from "./editor/hui-dialog-save-config";
import { fetchConfig } from "../../data/lovelace";
import "../../layouts/hass-loading-screen";
import "../../layouts/hass-error-screen";
import "./hui-root";
import localizeMixin from "../../mixins/localize-mixin";

let registeredDialog = false;

class Lovelace extends localizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
        }
      </style>
      <template is="dom-if" if="[[_equal(_state, &quot;loaded&quot;)]]" restamp>
        <hui-root
          narrow="[[narrow]]"
          show-menu="[[showMenu]]"
          hass="[[hass]]"
          route="[[route]]"
          config="[[_config]]"
          columns="[[_columns]]"
          on-config-refresh="_forceFetchConfig"
        ></hui-root>
      </template>
      <template
        is="dom-if"
        if="[[_equal(_state, &quot;loading&quot;)]]"
        restamp
      >
        <hass-loading-screen
          narrow="[[narrow]]"
          show-menu="[[showMenu]]"
        ></hass-loading-screen>
      </template>
      <template is="dom-if" if="[[_equal(_state, &quot;error&quot;)]]" restamp>
        <hass-error-screen
          title="Lovelace"
          error="[[_errorMsg]]"
          narrow="[[narrow]]"
          show-menu="[[showMenu]]"
        >
          <paper-button on-click="_forceFetchConfig"
            >Reload ui-lovelace.yaml</paper-button
          >
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
    this._fetchConfig(false);
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

  _forceFetchConfig() {
    this._fetchConfig(true);
  }

  async _fetchConfig(force) {
    try {
      const conf = await fetchConfig(this.hass, force);
      this.setProperties({
        _config: conf,
        _state: "loaded",
      });
    } catch (err) {
      if (err.code === "config_not_found") {
        const {
          generateLovelaceConfig,
        } = await import("./common/generate-lovelace-config");
        this.setProperties({
          _config: generateLovelaceConfig(this.hass, this.localize),
          _state: "loaded",
        });
        if (!registeredDialog) {
          registeredDialog = true;
          registerSaveDialog(this);
        }
      } else {
        this.setProperties({ _state: "error", _errorMsg: err.message });
      }
    }
  }

  _equal(a, b) {
    return a === b;
  }
}

customElements.define("ha-panel-lovelace", Lovelace);
