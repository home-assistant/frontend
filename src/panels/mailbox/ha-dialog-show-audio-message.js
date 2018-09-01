import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../resources/ha-style.js';

import LocalizeMixin from '../../mixins/localize-mixin.js';

/*
 * @appliesMixin LocalizeMixin
 */
class HaDialogShowAudioMessage extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style-dialog">
      @media all and (max-width: 500px) {
        paper-dialog {
          margin: 0;
          width: 100%;
          max-height: calc(100% - 64px);

          position: fixed !important;
          bottom: 0px;
          left: 0px;
          right: 0px;
          overflow: scroll;
          border-bottom-left-radius: 0px;
          border-bottom-right-radius: 0px;
        }
      }

      paper-dialog {
        border-radius: 2px;
      }
      paper-dialog p {
        color: var(--secondary-text-color);
      }

      #mp3dialog paper-icon-button {
        float: right;
      }
    </style>
    <paper-dialog id="mp3dialog" with-backdrop opened="{{_opened}}" on-opened-changed="_openedChanged">
      <h2>
        [[localize('ui.panel.mailbox.playback_title')]]
        <paper-icon-button
          on-click='openDeleteDialog'
          icon='hass:delete'
        ></paper-icon-button>
      </h2>
      <div id="transcribe"></div>
      <div>
        <audio id="mp3" preload="none" controls> <source id="mp3src" src="" type="audio/mpeg" /></audio>
      </div>
    </paper-dialog>
`;
  }

  static get properties() {
    return {
      hass: Object,

      _currentMessage: Object,

      _opened: {
        type: Boolean,
        value: false,
      },
    };
  }

  showDialog({ hass, platform, message }) {
    this.hass = hass;
    this._currentMessage = message
    this.$.mp3.src = null;
    this._opened = true;
    this.$.transcribe.innerText = message.message;
    var platform = message.platform;
    var mp3 = this.$.mp3;
    var url = 'mailbox/media/' + platform + '/' + message.sha;
    // Pass authorization in request:
    //   https://stackoverflow.com/questions/46878787/
    //           how-to-set-loaded-audio-to-a-html-audio-tag-controller
    var oReq = new XMLHttpRequest();
    var auth = this.hass.connection.options.auth;
    oReq.open('GET', '/api/' + url, true);
    oReq.responseType = 'blob';
    oReq.setRequestHeader('authorization', `Bearer ${auth.accessToken}`);
    oReq.onload = function () {
      var blob = oReq.response; // Note: not oReq.responseText
      if (blob) {
        mp3.src = window.URL.createObjectURL(blob);
        mp3.play();
      }
    };
    oReq.send();
  }

  openDeleteDialog() {
    if (confirm(this.localize('ui.panel.mailbox.delete_prompt'))) {
        this.deleteSelected()
    }
  }

  deleteSelected() {
    var msg = this._currentMessage;
    this.hass.callApi('DELETE', 'mailbox/delete/' + msg.platform + '/' + msg.sha);
    this._dialogDone()
  }

  _dialogDone() {
    this.$.mp3.pause();
    this.setProperties({
      _currentMessage: null,
      _opened: false,
    });
  }

  _openedChanged(ev) {
    // Closed dialog by clicking on the overlay
    // Check against dialogClosedCallback to make sure we didn't change
    // programmatically
    if (!ev.detail.value) {
      this._dialogDone()
    }
  }
}
customElements.define('ha-dialog-show-audio-message', HaDialogShowAudioMessage);
