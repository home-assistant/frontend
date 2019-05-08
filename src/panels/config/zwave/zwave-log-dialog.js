import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/dialog/ha-paper-dialog";
import "../../../resources/ha-style";

import { EventsMixin } from "../../../mixins/events-mixin";

class ZwaveLogDialog extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style-dialog">
    </style>
      <ha-paper-dialog id="pwaDialog" with-backdrop="" opened="{{_opened}}">
        <h2>OpenZwave internal logfile</h2>
        <paper-dialog-scrollable>
          <pre>[[_ozwLog]]</pre>
        <paper-dialog-scrollable>
      </ha-paper-dialog>
      `;
  }

  static get properties() {
    return {
      hass: Object,
      _ozwLog: String,

      _dialogClosedCallback: Function,

      _opened: {
        type: Boolean,
        value: false,
      },

      _intervalId: String,

      _numLogLines: {
        type: Number,
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener("iron-overlay-closed", (ev) =>
      this._dialogClosed(ev)
    );
  }

  showDialog({ _ozwLog, hass, _tail, _numLogLines, dialogClosedCallback }) {
    this.hass = hass;
    this._ozwLog = _ozwLog;
    this._opened = true;
    this._dialogClosedCallback = dialogClosedCallback;
    this._numLogLines = _numLogLines;
    setTimeout(() => this.$.pwaDialog.center(), 0);
    if (_tail) {
      this.setProperties({
        _intervalId: setInterval(() => {
          this._refreshLog();
        }, 1500),
      });
    }
  }

  async _refreshLog() {
    const info = await this.hass.callApi(
      "GET",
      "zwave/ozwlog?lines=" + this._numLogLines
    );
    this.setProperties({ _ozwLog: info });
  }

  _dialogClosed(ev) {
    if (ev.target.nodeName === "ZWAVE-LOG-DIALOG") {
      clearInterval(this._intervalId);
      this._opened = false;
      const closedEvent = true;
      this._dialogClosedCallback({ closedEvent });
      this._dialogClosedCallback = null;
    }
  }
}

customElements.define("zwave-log-dialog", ZwaveLogDialog);
