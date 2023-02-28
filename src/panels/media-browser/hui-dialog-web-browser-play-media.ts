import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-hls-player";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { WebBrowserPlayMediaDialogParams } from "./show-media-player-dialog";

@customElement("hui-dialog-web-browser-play-media")
export class HuiDialogWebBrowserPlayMedia extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  private _params?: WebBrowserPlayMediaDialogParams;

  public showDialog(params: WebBrowserPlayMediaDialogParams): void {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._params.sourceType || !this._params.sourceUrl) {
      return nothing;
    }

    const mediaType = this._params.sourceType.split("/", 1)[0];

    return html`
      <ha-dialog
        open
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          this._params.title ||
            this.hass.localize("ui.components.media-browser.media_player")
        )}
        @closed=${this.closeDialog}
      >
        ${mediaType === "audio"
          ? html`
              <audio controls autoplay>
                <source
                  src=${this._params.sourceUrl}
                  type=${this._params.sourceType}
                />
                ${this.hass.localize(
                  "ui.components.media-browser.audio_not_supported"
                )}
              </audio>
            `
          : mediaType === "video"
          ? html`
              <video controls autoplay playsinline>
                <source
                  src=${this._params.sourceUrl}
                  type=${this._params.sourceType}
                />
                ${this.hass.localize(
                  "ui.components.media-browser.video_not_supported"
                )}
              </video>
            `
          : this._params.sourceType === "application/x-mpegURL"
          ? html`
              <ha-hls-player
                controls
                autoplay
                playsinline
                .hass=${this.hass}
                .url=${this._params.sourceUrl}
              ></ha-hls-player>
            `
          : mediaType === "image"
          ? html`<img
              alt=${this._params.title || nothing}
              src=${this._params.sourceUrl}
            />`
          : html`${this.hass.localize(
              "ui.components.media-browser.media_not_supported"
            )}`}
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        @media (min-width: 800px) {
          ha-dialog {
            --mdc-dialog-max-width: 800px;
            --mdc-dialog-min-width: 400px;
          }
        }

        video,
        audio,
        img {
          outline: none;
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-web-browser-play-media": HuiDialogWebBrowserPlayMedia;
  }
}
