import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-dialog/paper-dialog.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../resources/ha-style.js';

import EventsMixin from '../../../mixins/events-mixin.js';

class ZwaveLogDialog extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style-dialog">
    </style>
      <paper-dialog id="pwaDialog" with-backdrop="" opened="{{_opened}}">
        <h2>OpenZwave internal logfile</h2>
        <paper-dialog-scrollable>
          <pre>[[_ozwLog]]</pre>
        <paper-dialog-scrollable>
      </paper-dialog>
      `;
  }

  static get properties() {
    return {
      _ozwLog: String,

      _dialogClosedCallback: Function,

      _opened: {
        type: Boolean,
        value: false,
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener('iron-overlay-closed', ev => this._dialogClosed(ev));
  }

  showDialog({ _ozwLog, dialogClosedCallback }) {
    console.log('showDialog');
    this._ozwLog = _ozwLog;
    this._opened = true;
    this._dialogClosedCallback = dialogClosedCallback;
    setTimeout(() => this.$.pwaDialog.center(), 0);
  }

  _dialogClosed(ev) {
    console.log('_dialogClosed', ev.target.nodeName);
    if (ev.target.nodeId === 'ZWAVE-LOG-DIALOG') {
      this._opened = false;
      const closedEvent = true;
      this._dialogClosedCallback({ closedEvent });
      this._dialogClosedCallback = null;
    }
  }
}

customElements.define('zwave-log-dialog', ZwaveLogDialog);
