import "@material/mwc-button";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import LocalizeMixin from "../../../mixins/localize-mixin";
import { EventsMixin } from "../../../mixins/events-mixin";
import isPwa from "../../../common/config/is_pwa";

import "../ha-config-section";
import "../../../components/ha-card";

let registeredDialog = false;

class OzwLog extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      .content {
        margin-top: 24px;
      }

      ha-card {
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
      <span slot="header">
        [[localize('ui.panel.config.zwave.ozw_log.header')]]
      </span>
      <span slot="introduction">
        [[localize('ui.panel.config.zwave.ozw_log.introduction')]]
      </span>
      <ha-card class="content">
        <div class="device-picker">
          <paper-input label="Number of last log lines." type="number" min="0" max="1000" step="10" value="{{numLogLines}}">
          </paper-input>
        </div>
        <div class="card-actions">
          <mwc-button raised="true" on-click="_openLogWindow">Load</mwc-button>
          <mwc-button raised="true" on-click="_tailLog" disabled="{{_completeLog}}">Tail</mwc-button>
      </ha-card>
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
        dialogImport: () =>
          import(
            /* webpackChunkName: "zwave-log-dialog" */ "./zwave-log-dialog"
          ),
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
