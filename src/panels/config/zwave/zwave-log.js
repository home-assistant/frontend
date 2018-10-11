import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-checkbox/paper-checkbox.js";
import "@polymer/paper-input/paper-input.js";
import "@polymer/paper-dialog/paper-dialog.js";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import EventsMixin from "../../../mixins/events-mixin.js";
import isPwa from "../../../common/config/is_pwa.js";

import "../ha-config-section.js";

let registeredDialog = false;

class OzwLog extends EventsMixin(PolymerElement) {
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
          <paper-button raised="true" on-click="_openLogWindow">Load</paper-button>   
          <paper-button raised="true" on-click="_tailLog" disabled="{{_completeLog}}">Tail</paper-button>
      </paper-card>
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
        value: true,
      },

      numLogLines: {
        type: Number,
        value: 0,
        observer: "_isCompleteLog",
      },

      _intervalId: String,

      tail: Boolean,
    };
  }

  async _tailLog() {
    this.setProperties({ tail: true });
    const ozwWindow = await this._openLogWindow();
    if (!isPwa()) {
      this.setProperties({
        _intervalId: setInterval(() => {
          this._refreshLog(ozwWindow);
        }, 1500),
      });
    }
  }

  async _openLogWindow() {
    const info = await this.hass.callApi(
      "GET",
      "zwave/ozwlog?lines=" + this.numLogLines
    );
    this.setProperties({ _ozwLogs: info });
    if (isPwa()) {
      this._showOzwlogDialog();
      return -1;
    }
    const ozwWindow = open("", "ozwLog", "toolbar");
    ozwWindow.document.body.innerHTML = `<pre>${this._ozwLogs}</pre>`;
    return ozwWindow;
  }

  async _refreshLog(ozwWindow) {
    if (ozwWindow.closed === true) {
      clearInterval(this._intervalId);
      this.setProperties({ _intervalId: null });
    } else {
      const info = await this.hass.callApi(
        "GET",
        "zwave/ozwlog?lines=" + this.numLogLines
      );
      this.setProperties({ _ozwLogs: info });
      ozwWindow.document.body.innerHTML = `<pre>${this._ozwLogs}</pre>`;
    }
  }

  _isCompleteLog() {
    if (this.numLogLines !== "0") {
      this.setProperties({ _completeLog: false });
    } else {
      this.setProperties({ _completeLog: true });
    }
  }

  connectedCallback() {
    super.connectedCallback();
    if (!registeredDialog) {
      registeredDialog = true;
      this.fire("register-dialog", {
        dialogShowEvent: "show-ozwlog-dialog",
        dialogTag: "zwave-log-dialog",
        dialogImport: () => import("./zwave-log-dialog.js"),
      });
    }
  }

  _showOzwlogDialog() {
    this.fire("show-ozwlog-dialog", {
      hass: this.hass,
      _numLogLines: this.numLogLines,
      _ozwLog: this._ozwLogs,
      _tail: this.tail,
      dialogClosedCallback: () => this._dialogClosed(),
    });
  }

  _dialogClosed() {
    this.setProperties({
      tail: false,
    });
  }
}
customElements.define("ozw-log", OzwLog);
