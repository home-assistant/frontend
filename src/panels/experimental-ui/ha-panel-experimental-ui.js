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
import './hui-root.js';

class ExperimentalUI extends PolymerElement {
  static get template() {
    return html`
      <template is='dom-if' if='[[!_config]]' restamp>
        <hass-loading-screen
          narrow="[[narrow]]"
          show-menu="[[showMenu]]"
        ></hass-loading-screen>
      </template>
      <template is='dom-if' if='[[_config]]' restamp>
        <hui-root
          hass='[[hass]]'
          config='[[_config]]'
          columns='[[_columns]]'
          on-config-refresh='_fetchConfig'
        ></hui-view>
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
    this.hass.connection.sendMessagePromise({ type: 'frontend/experimental_ui' })
      .then((conf) => { this._config = conf.result; });
  }
}

customElements.define('ha-panel-experimental-ui', ExperimentalUI);
