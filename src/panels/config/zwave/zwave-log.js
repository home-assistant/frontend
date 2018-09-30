import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
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
          <paper-input label="Number of last log lines." type="number" min="0" max="1000" step="10" value="{{_numLogLines}}">
          </paper-input>
        </div>
        <div class="card-actions">
          <paper-button raised="true" on-click="_openLogWindow">Load</paper-button>   
          <paper-button raised="true" on-click="_tailLog" disabled="{{_completeLog}}">Tail</paper-button>
      </paper-card>
      <paper-dialog id="pwaDialog">
        <h2>OpenZwave internal logfile</h2>
        <paper-dialog-scrollable>
          <pre>[[_ozwLogs]]</pre>
        <paper-dialog-scrollable>
      </paper-dialog>
    </ha-config-section>
`;
  }

  static get properties() {
    return {
      hass: Object,

      isWide: {
        type: Boolean,
        value: false,
      },

      _ozwLogs: String,

      _completeLog: {
        type: Boolean,
        value: true
      },

      _numLogLines: {
        type: Number,
        value: 0,
        observer: '_isCompleteLog'
      },

      _intervalId: String,
    };
  }

  async _tailLog() {
    const ozwWindow = await this._openLogWindow();
    this.setProperties({
      _intervalId: setInterval(() => { this._refreshLog(ozwWindow); }, 1500) });
  }

  async _openLogWindow() {
    const info = await this.hass.callApi('GET', 'zwave/ozwlog?lines=' + this._numLogLines);
    this.setProperties({ _ozwLogs: info });
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.$.pwaDialog.open();
      return -1;
    }
    const ozwWindow = open('', 'ozwLog', 'toolbar');
    ozwWindow.document.body.innerHTML = `<pre>${this._ozwLogs}</pre>`;
    return ozwWindow;
  }

  async _refreshLog(ozwWindow) {
    if (ozwWindow.closed === true || this.$.pwaDialog.opened === false) {
      clearInterval(this._intervalId);
      this.setProperties({ _intervalId: null });
    } else {
      const info = await this.hass.callApi('GET', 'zwave/ozwlog?lines=' + this._numLogLines);
      this.setProperties({ _ozwLogs: info });
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return;
      }
      ozwWindow.document.body.innerHTML = `<pre>${this._ozwLogs}</pre>`;
    }
  }

  _isCompleteLog() {
    if (this._numLogLines !== '0') {
      this.setProperties({ _completeLog: false });
    } else { this.setProperties({ _completeLog: true }); }
  }
}
customElements.define('ozw-log', OzwLog);
