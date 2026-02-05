import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-wa-dialog";
import "../../components/ha-hls-player";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { WebBrowserPlayMediaDialogParams } from "./show-media-player-dialog";

@customElement("hui-dialog-web-browser-play-media")
export class HuiDialogWebBrowserPlayMedia extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: WebBrowserPlayMediaDialogParams;

  @state() private _open = false;

  public showDialog(params: WebBrowserPlayMediaDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    const img = this.renderRoot.querySelector("img");
    if (img) {
      // Unload streaming images so the connection can be closed
      img.src = "";
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._params.sourceType || !this._params.sourceUrl) {
      return nothing;
    }

    const mediaType = this._params.sourceType.split("/", 1)[0];

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        width="large"
        header-title=${this._params.title ||
        this.hass.localize("ui.components.media-browser.media_player")}
        @closed=${this._dialogClosed}
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
      </ha-wa-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
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
