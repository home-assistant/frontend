import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-icon.js';

class HuiWeblinkRow extends PolymerElement {
  static get template() {
    return html`
      <style>
        a {
          display: flex;
          align-items: center;
          color: var(--primary-color);
        }
        ha-icon {
          padding: 8px;
          color: var(--paper-item-icon-color);
        }
        div {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-left: 16px;
        }
      </style>
      <a href="[[_config.url]]">
        <ha-icon icon="[[_config.icon]]"></ha-icon>
        <div>
          [[_config.name]]
        </div>
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
