import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-icon.js';

class HuiWeblinkRow extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          cursor: pointer;
        }
        ha-icon {
          padding: 8px;
          color: var(--paper-item-icon-color);
        }
        a {
          color: var(--primary-color);
          margin-left: 16px;
        }
      </style>
      <ha-icon icon="[[_config.icon]]"></ha-icon>
      <a href="[[_config.url]]">[[_config.name]]</a>
    `;
  }

  static get properties() {
    return {
      _config: Object
    };
  }

  ready() {
    super.ready();
    this.addEventListener('click', () => this._handleClick());
  }

  setConfig(config) {
    if (!config || !config.icon || !config.name || !config.url ) {
      throw new Error('Error in card configuration.');
    }
    this._config = config;
  }

  _handleClick() {
    window.open(this._config.url, '_blank');
  }
}
customElements.define('hui-weblink-row', HuiWeblinkRow);
