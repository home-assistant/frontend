import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { EventsMixin } from "../../../../../mixins/events-mixin";
import "../../../../../styles/polymer-ha-style-dialog";
import "../../../../../components/ha-dialog";

class ZwaveLogDialog extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style-dialog">
      pre {
        font-family: var(--code-font-family, monospace);
      }
    </style>
      <ha-dialog open="[[_opened]]" heading="OpenZwave internal logfile" on-closed="closeDialog">
        <div>
          <pre>[[_ozwLog]]</pre>
        <div>
      </ha-dialog>
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
    if (_tail) {
      this.setProperties({
        _intervalId: setInterval(() => {
          this._refreshLog();
        }, 1500),
      });
    }
  }

  closeDialog() {
    clearInterval(this._intervalId);
    this._opened = false;
    const closedEvent = true;
    this._dialogClosedCallback({ closedEvent });
    this._dialogClosedCallback = null;
  }

  async _refreshLog() {
    const info = await this.hass.callApi(
      "GET",
      "zwave/ozwlog?lines=" + this._numLogLines
    );
    this.setProperties({ _ozwLog: info });
  }
}

customElements.define("zwave-log-dialog", ZwaveLogDialog);
