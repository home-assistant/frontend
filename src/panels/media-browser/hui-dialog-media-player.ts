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
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-hls-player";
import type { HomeAssistant } from "../../types";
import { MediaPlayerDialogParams } from "./show-media-player-dialog";

@customElement("hui-dialog-media-player")
export class HuiDialogMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  private _params?: MediaPlayerDialogParams;

  @internalProperty() _sourceUrl?: string;

  @internalProperty() _sourceType?: string;

  @internalProperty() _title?: string;

  public async showDialog(params: MediaPlayerDialogParams): Promise<void> {
    this._params = params;
    this._sourceUrl = this._params.sourceUrl;
    this._sourceType = this._params.sourceType;
    this._title = this._params.title;

    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params || !this._sourceType || !this._sourceUrl) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          this._title ||
            this.hass.localize(
              "ui.components.media-browser.audio_not_supported"
            )
        )}
        @closed=${this._closeDialog}
      >
        ${this._sourceType.startsWith("audio")
          ? html`
              <audio controls autoplay>
                <source src=${this._sourceUrl} type=${this._sourceType} />
                ${this.hass.localize(
                  "ui.components.media-browser.audio_not_supported"
                )}
              </audio>
            `
          : this._sourceType.startsWith("video")
          ? html`
              <video controls autoplay playsinline>
                <source src=${this._sourceUrl} type=${this._sourceType} />
                ${this.hass.localize(
                  "ui.components.media-browser.video_not_supported"
                )}
              </video>
            `
          : this._sourceType.startsWith("application/x-mpegURL")
          ? html`
              <ha-hls-player
                controls
                autoplay
                playsinline
                .hass=${this.hass}
                .url=${this._sourceUrl}
              ></ha-hls-player>
            `
          : this._sourceType.startsWith("image")
          ? html`<img src=${this._sourceUrl} />`
          : ""}
      </ha-dialog>
    `;
  }

  private _closeDialog() {
    this._params = undefined;
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
    "hui-dialog-media-player": HuiDialogMediaPlayer;
  }
}
