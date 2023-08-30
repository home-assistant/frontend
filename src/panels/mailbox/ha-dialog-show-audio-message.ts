import "@material/mwc-button";
import "../../components/ha-dialog";
import "../../components/ha-circular-progress";
import "../../components/ha-icon";
import "../../components/ha-icon-button";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant } from "../../types";
import { haStyleDialog } from "../../resources/styles";

@customElement("ha-dialog-show-audio-message")
class HaDialogShowAudioMessage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _currentMessage?: any;

  @state() private _errorMsg?: string;

  @state() private _loading: boolean = false;

  @state() private _opened: boolean = false;

  @state() private _blobUrl?: string;

  protected render(): TemplateResult {
    return html`
      <ha-dialog
        .open=${this._opened}
        @closed=${this._closeDialog}
        heading=${this.hass.localize("ui.panel.mailbox.playback_title")}
      >
        ${this._loading
          ? html`<ha-circular-progress active></ha-circular-progress>`
          : html`<div class="icon">
                <ha-icon-button id="delicon" @click=${this._openDeleteDialog}>
                  <ha-icon icon="hass:delete"></ha-icon>
                </ha-icon-button>
              </div>
              ${
                this._currentMessage
                  ? html`<div id="transcribe">
                      ${this._currentMessage?.message}
                    </div>`
                  : nothing
              }
                ${
                  this._errorMsg
                    ? html`<div class="error">${this._errorMsg}</div>`
                    : nothing
                }
                ${
                  this._blobUrl
                    ? html` <audio id="mp3" preload="none" controls autoplay>
                        <source
                          id="mp3src"
                          src=${this._blobUrl}
                          type="audio/mpeg"
                        />
                      </audio>`
                    : nothing
                }
              </div>`}
      </ha-dialog>
    `;
  }

  showDialog({ hass, message }) {
    this.hass = hass;
    this._errorMsg = undefined;
    this._currentMessage = message;
    this._opened = true;
    const platform = message.platform;
    if (platform.has_media) {
      this._loading = true;
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
          this._loading = false;
          this._blobUrl = window.URL.createObjectURL(blob);
        })
        .catch((err) => {
          this._loading = false;
          this._errorMsg = `Error loading audio: ${err.statusText}`;
        });
    } else {
      this._loading = false;
    }
  }

  private _openDeleteDialog() {
    if (confirm(this.hass.localize("ui.panel.mailbox.delete_prompt"))) {
      this._deleteSelected();
    }
  }

  private _deleteSelected() {
    const msg = this._currentMessage;
    this.hass.callApi(
      "DELETE",
      `mailbox/delete/${msg.platform.name}/${msg.sha}`
    );
    this._closeDialog();
  }

  private _closeDialog() {
    const mp3 = this.shadowRoot!.querySelector("#mp3")! as any;
    mp3.pause();
    this._currentMessage = undefined;
    this._errorMsg = undefined;
    this._loading = false;
    this._opened = false;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .error {
          color: red;
        }
        p {
          color: var(--secondary-text-color);
        }
        .icon {
          text-align: var(--float-end);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-show-audio-message": HaDialogShowAudioMessage;
  }
}
