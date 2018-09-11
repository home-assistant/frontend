import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-spinner/paper-spinner.js';
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
      .error {
        color: red;
      }
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

      .icon {
        float: right;
      }
    </style>
    <paper-dialog id="mp3dialog" with-backdrop opened="{{_opened}}" on-opened-changed="_openedChanged">
      <h2>
        [[localize('ui.panel.mailbox.playback_title')]]
        <div class='icon'>
        <template is="dom-if" if="[[_loading]]">
          <paper-spinner active></paper-spinner>
        </template>
        <template is="dom-if" if="[[!_loading]]">
          <paper-icon-button
            on-click='openDeleteDialog'
            icon='hass:delete'
          ></paper-icon-button>
        </template>
        </div>
      </h2>
      <div id="transcribe"></div>
      <div>
        <template is="dom-if" if="[[_errorMsg]]">
          <div class='error'>[[_errorMsg]]</div>
        </template>
        <audio id="mp3" preload="none" controls> <source id="mp3src" src="" type="audio/mpeg" /></audio>
      </div>
    </paper-dialog>
`;
  }

  static get properties() {
    return {
      hass: Object,

      _currentMessage: Object,

      // Error message when can't talk to server etc
      _errorMsg: String,

      _loading: {
        type: Boolean,
        value: false,
      },

      _opened: {
        type: Boolean,
        value: false,
      },
    };
  }

  showDialog({ hass, message }) {
    this.hass = hass;
    this._loading = true;
    this._errorMsg = null;
    this._currentMessage = message;
    this._opened = true;
    this.$.transcribe.innerText = message.message;
    const platform = message.platform;
    const mp3 = this.$.mp3;
    mp3.src = null;
    const url = `mailbox/media/${platform}/${message.sha}`;
    this.hass.fetchWithAuth(url)
      .then((response) => {
        if (response.ok) {
          return response.blob();
        }
        return Promise.reject({
          status: response.status,
          statusText: response.statusText
        });
      })
      .then((blob) => {
        this._loading = false;
        mp3.src = window.URL.createObjectURL(blob);
        mp3.play();
      })
      .catch((err) => {
        this._loading = false;
        this._errorMsg = `Error loading audio: ${err.statusText}`;
      });
  }

  openDeleteDialog() {
    if (confirm(this.localize('ui.panel.mailbox.delete_prompt'))) {
      this.deleteSelected();
    }
  }

  deleteSelected() {
    const msg = this._currentMessage;
    this.hass.callApi('DELETE', `mailbox/delete/${msg.platform}/${msg.sha}`);
    this._dialogDone();
  }

  _dialogDone() {
    this.$.mp3.pause();
    this.setProperties({
      _currentMessage: null,
      _errorMsg: null,
      _loading: false,
      _opened: false,
    });
  }

  _openedChanged(ev) {
    // Closed dialog by clicking on the overlay
    // Check against dialogClosedCallback to make sure we didn't change
    // programmatically
    if (!ev.detail.value) {
      this._dialogDone();
    }
  }
}
customElements.define('ha-dialog-show-audio-message', HaDialogShowAudioMessage);
