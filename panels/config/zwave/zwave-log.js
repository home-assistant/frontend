import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-input/paper-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../ha-config-section.js';

class OzwLog extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        margin-top: 24px;
      }

      paper-card {
        display: block;
        margin: 0 auto;
        max-width: 600px;
      }

      .device-picker {
        padding-left: 24px;
        padding-right: 24px;
        padding-bottom: 24px;
      }
    </style>
    <ha-config-section is-wide="[[isWide]]">
      <span slot="header">OZW Log</span>
      <paper-card>
      <div class="device-picker">
        <paper-input label="Number of last log lines." type="number" min="0" max="1000" step="10" value="{{numLogLines}}">
        </paper-input>
      </div>
      <div class="card-actions">
        <paper-button raised="" on-click="refreshLog">Refresh</paper-button>
      </div>
      <div class="help-text">
             <pre>[[ozwLogs]]</pre>
      </div>
      </paper-card>
    </ha-config-section>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      isWide: {
        type: Boolean,
        value: false,
      },

      ozwLogs: {
        type: String,
        value: 'Refresh to pull log'
      },

      numLogLines: {
        type: Number,
        value: 0
      },
    };
  }

  refreshLog() {
    this.ozwLogs = 'Loading ozw log...';
    this.hass.callApi('GET', 'zwave/ozwlog?lines=' + this.numLogLines)
      .then((info) => {
        this.ozwLogs = info;
      });
  }
}

customElements.define('ozw-log', OzwLog);
