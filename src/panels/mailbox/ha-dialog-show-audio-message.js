import "@material/mwc-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../components/ha-dialog";
import "../../components/ha-circular-progress";
import "../../components/ha-icon";
import "../../components/ha-icon-button";
import LocalizeMixin from "../../mixins/localize-mixin";
import "../../styles/polymer-ha-style-dialog";

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
        p {
          color: var(--secondary-text-color);
        }
        .icon {
          text-align: right;
        }
      </style>
      <ha-dialog
        open="[[_opened]]"
        on-closed="closeDialog"
        heading="[[localize('ui.panel.mailbox.playback_title')]]"
      >
        <div>
          <div class="icon">
            <template is="dom-if" if="[[_loading]]">
              <ha-circular-progress active></ha-circular-progress>
            </template>
            <ha-icon-button id="delicon" on-click="openDeleteDialog">
              <ha-icon icon="hass:delete"></ha-icon>
            </ha-icon-button>
          </div>
          <div id="transcribe"></div>
          <div>
            <template is="dom-if" if="[[_errorMsg]]">
              <div class="error">[[_errorMsg]]</div>
            </template>
            <audio id="mp3" preload="none" controls>
              <source id="mp3src" src="" type="audio/mpeg" />
            </audio>
          </div>
        </div>
      </ha-dialog>
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

  closeDialog() {
    this._dialogDone();
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
