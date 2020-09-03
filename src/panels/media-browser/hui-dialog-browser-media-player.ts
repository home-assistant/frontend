import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-hls-player";
import type { HomeAssistant } from "../../types";
import { MediaPlayerBrowserDialogParams } from "./show-media-player-dialog";

@customElement("hui-dialog-browser-media-player")
export class HuiDialogBrowserMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  private _params?: MediaPlayerBrowserDialogParams;

  @internalProperty() _sourceUrl?: string;

  @internalProperty() _sourceType?: string;

  @internalProperty() _title?: string;

  public showDialog(params: MediaPlayerBrowserDialogParams): void {
    this._params = params;
    this._sourceUrl = this._params.sourceUrl;
    this._sourceType = this._params.sourceType;
    this._title = this._params.title;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", {dialog: this.localName});
  }

  protected render(): TemplateResult {
    if (!this._params || !this._sourceType || !this._sourceUrl) {
      return html``;
    }

    const mediaType = this._sourceType.split("/", 1)[0];

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          this._title ||
            this.hass.localize("ui.components.media-browser.media_player")
        )}
        @closed=${this.closeDialog}
      >
        ${mediaType === "audio"
          ? html`
              <audio controls autoplay>
                <source src=${this._sourceUrl} type=${this._sourceType} />
                ${this.hass.localize(
                  "ui.components.media-browser.audio_not_supported"
                )}
              </audio>
            `
          : mediaType === "video"
          ? html`
              <video controls autoplay playsinline>
                <source src=${this._sourceUrl} type=${this._sourceType} />
                ${this.hass.localize(
                  "ui.components.media-browser.video_not_supported"
                )}
              </video>
            `
          : this._sourceType === "application/x-mpegURL"
          ? html`
              <ha-hls-player
                controls
                autoplay
                playsinline
                .hass=${this.hass}
                .url=${this._sourceUrl}
              ></ha-hls-player>
            `
          : mediaType === "image"
          ? html`<img src=${this._sourceUrl} />`
          : html`${this.hass.localize(
              "ui.components.media-browser.media_not_supported"
            )}`}
      </ha-dialog>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-dialog {
        --mdc-dialog-heading-ink-color: var(--primary-text-color);
      }

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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-browser-media-player": HuiDialogBrowserMediaPlayer;
  }
}
