import "@material/mwc-button";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../resources/ha-style";
import "../../components/dialog/ha-paper-dialog";

import LocalizeMixin from "../../mixins/localize-mixin";

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
          ha-paper-dialog {
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

        ha-paper-dialog {
          border-radius: 2px;
        }
        ha-paper-dialog p {
          color: var(--secondary-text-color);
        }

        .icon {
          float: right;
        }
      </style>
      <ha-paper-dialog
        id="mp3dialog"
        with-backdrop
        opened="{{_opened}}"
        on-opened-changed="_openedChanged"
      >
        <h2>
          [[localize('ui.panel.mailbox.playback_title')]]
          <div class="icon">
            <template is="dom-if" if="[[_loading]]">
              <paper-spinner active></paper-spinner>
            </template>
            <paper-icon-button
              id="delicon"
              on-click="openDeleteDialog"
              icon="hass:delete"
            ></paper-icon-button>
          </div>
        </h2>
        <div id="transcribe"></div>
        <div>
          <template is="dom-if" if="[[_errorMsg]]">
            <div class="error">[[_errorMsg]]</div>
          </template>
          <audio id="mp3" preload="none" controls>
            <source id="mp3src" src="" type="audio/mpeg" />
          </audio>
        </div>
      </ha-paper-dialog>
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
    this._errorMsg = null;
    this._currentMessage = message;
    this._opened = true;
    this.$.transcribe.innerText = message.message;
    const platform = message.platform;
    const mp3 = this.$.mp3;
    if (platform.has_media) {
      mp3.style.display = "";
      this._showLoading(true);
      mp3.src = null;
      const url = `/api/mailbox/media/${platform.name}/${message.sha}`;
      this.hass
        .fetchWithAuth(url)
        .then((response) => {
          if (response.ok) {
            return response.blob();
          }
          return Promise.reject({
            status: response.status,
            statusText: response.statusText,
          });
        })
        .then((blob) => {
          this._showLoading(false);
          mp3.src = window.URL.createObjectURL(blob);
          mp3.play();
        })
        .catch((err) => {
          this._showLoading(false);
          this._errorMsg = `Error loading audio: ${err.statusText}`;
        });
    } else {
      mp3.style.display = "none";
      this._showLoading(false);
    }
  }

  openDeleteDialog() {
    if (confirm(this.localize("ui.panel.mailbox.delete_prompt"))) {
      this.deleteSelected();
    }
  }

  deleteSelected() {
    const msg = this._currentMessage;
    this.hass.callApi(
      "DELETE",
      `mailbox/delete/${msg.platform.name}/${msg.sha}`
    );
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

  _showLoading(displayed) {
    const delicon = this.$.delicon;
    if (displayed) {
      this._loading = true;
      delicon.style.display = "none";
    } else {
      const platform = this._currentMessage.platform;
      this._loading = false;
      delicon.style.display = platform.can_delete ? "" : "none";
    }
  }
}
customElements.define("ha-dialog-show-audio-message", HaDialogShowAudioMessage);
