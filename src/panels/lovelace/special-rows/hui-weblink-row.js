import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-icon.js';

class HuiWeblinkRow extends PolymerElement {
  static get template() {
    return html`
      <style>
        a {
          display: block;
          color: var(--primary-color);
        }
        ha-icon {
          padding: 8px;
          margin-right: 16px;
          color: var(--paper-item-icon-color);
        }

      </style>
      <a href="[[_config.url]]">
        <ha-icon icon="[[_config.icon]]"></ha-icon>[[_config.name]]
      </a>
    `;
  }

  static get properties() {
    return {
      _config: Object
    };
  }

  setConfig(config) {
    if (!config || !config.icon || !config.name || !config.url) {
      throw new Error('Error in card configuration.');
    }
    this._config = config;
  }
}
customElements.define('hui-weblink-row', HuiWeblinkRow);
