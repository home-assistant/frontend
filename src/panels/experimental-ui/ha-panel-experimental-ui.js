import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';

import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './hui-view.js';

class ExperimentalUI extends PolymerElement {
  static get template() {
    return html`
    <style include='ha-style'>
    </style>
    <app-header-layout has-scrolling-region>
      <app-header slot="header" fixed>
        <app-toolbar>
          <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
          <div main-title>Experimental UI</div>
        </app-toolbar>
      </app-header>

      <hui-view
        hass='[[hass]]'
        config='[[_curView]]'
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
    this.hass.connection.sendMessagePromise({ type: 'frontend/experimental_ui' })
      .then(conf => { this._config = conf.result; });
  }

  _configChanged(config) {
    if (!config) return;
    // Currently hardcode to first view.
    this._curView = config.views[0];
  }
}

customElements.define('ha-panel-experimental-ui', ExperimentalUI);
