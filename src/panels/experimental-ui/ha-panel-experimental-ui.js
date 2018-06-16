import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-view.js';

class ExperimentalUI extends PolymerElement {
  static get template() {
    return html`
    <style include='ha-style'>
      app-header-layout {
        height: 100%;
      }
    </style>
    <app-header-layout>
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>Experimental UI</div>
          <paper-icon-button icon='hass:refresh' on-click='_fetchConfig'></paper-icon-button>
        </app-toolbar>
      </app-header>

      <hui-view
        hass='[[hass]]'
        config='[[_curView]]'
        columns='[[_columns]]'
      ></hui-view>
    </app-header-layout>
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

      _columns: {
        type: Number,
        value: 1,
      },

      _config: {
        type: Object,
        value: null,
        observer: '_configChanged',
      },

      _curView: Object
    };
  }

  ready() {
    super.ready();
    this._fetchConfig();
    this._handleWindowChange = this._handleWindowChange.bind(this);
    this.mqls = [300, 600, 900, 1200].map((width) => {
      const mql = matchMedia(`(min-width: ${width}px)`);
      mql.addListener(this._handleWindowChange);
      return mql;
    });
    this._handleWindowChange();
  }

  _handleWindowChange() {
    const matchColumns = this.mqls.reduce((cols, mql) => cols + mql.matches, 0);
    // Do -1 column if the menu is docked and open
    this._columns = Math.max(1, matchColumns - (!this.narrow && this.showMenu));
  }

  _fetchConfig() {
    this.hass.connection.sendMessagePromise({ type: 'frontend/experimental_ui' })
      .then((conf) => { this._config = conf.result; });
  }

  _configChanged(config) {
    if (!config) return;
    // Currently hardcode to first view.
    this._curView = config.views[0];
  }
}

customElements.define('ha-panel-experimental-ui', ExperimentalUI);
