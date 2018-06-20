import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-tabs/paper-tab.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/iron-icon/iron-icon.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../layouts/hass-loading-screen.js';
import '../../layouts/hass-error-screen.js';
import './hui-root.js';

class Lovelace extends PolymerElement {
  static get template() {
    return html`
      <template is='dom-if' if='[[_equal(_state, "loading")]]' restamp>
        <hass-loading-screen
          title='Lovelace'
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
        ></hass-error-screen>
      </template>
      <template is='dom-if' if='[[_equal(_state, "loaded")]]' restamp>
        <hui-root
          hass='[[hass]]'
          config='[[_config]]'
          columns='[[_columns]]'
          on-config-refresh='_fetchConfig'
        ></hui-root>
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

      _columns: {
        type: Number,
        value: 1,
      },

      _state: {
        type: String,
        value: 'loading',
      },

      _errorMsg: String,

      _config: {
        type: Object,
        value: null,
      },
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
    this.hass.connection.sendMessagePromise({ type: 'frontend/lovelace_config' })
      .then(
        conf => this.setProperties({
          _config: conf.result,
          _state: 'loaded',
        }),
        err => this.setProperties({
          _state: 'error',
          _errorMsg: err.message,
        })
      );
  }

  _equal(a, b) {
    return a === b;
  }
}

customElements.define('ha-panel-lovelace', Lovelace);
