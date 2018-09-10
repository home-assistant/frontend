import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';

import '../../../components/ha-icon.js';
import callService from '../common/call-service.js';

class HuiCallServiceRow extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: flex;
          align-items: center;
        }
        ha-icon {
          padding: 8px;
          color: var(--paper-item-icon-color);
        }
        .flex {
          flex: 1;
          overflow: hidden;
          margin-left: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .flex div {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin-right: -.57em;
        }
      </style>
      <ha-icon icon="[[_config.icon]]"></ha-icon>
      <div class="flex">
        <div>
          [[_config.name]]
        </div>
        <paper-button on-click="_callService">[[_config.action_name]]</paper-button>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      _config: Object
    };
  }

  setConfig(config) {
    if (!config || !config.icon || !config.name || !config.action_name ||
        !config.service || !config.service_data) {
      throw new Error('Error in card configuration.');
    }
    this._config = config;
  }

  _callService() {
    callService(this._config, this.hass);
  }
}
customElements.define('hui-call-service-row', HuiCallServiceRow);
