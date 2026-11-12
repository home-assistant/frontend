import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog";
import "../../components/ha-hls-player";
import "../../components/ha-icon-button-next";
import "../../components/ha-icon-button-prev";
import "../../components/ha-spinner";
import type { ResolvedMediaSource } from "../../data/media_source";
import { resolveMediaSource } from "../../data/media_source";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../resources/styles";
import { animationStyles } from "../../resources/theme/animations.globals";
import type { HomeAssistant } from "../../types";
import type { WebBrowserPlayMediaDialogParams } from "./show-media-player-dialog";

// Default width of a large ha-dialog; a bigger picture is scaled down to it.
const LARGE_DIALOG_WIDTH = 1024;

// Keeps room for the title and the close button around a tiny picture.
const MIN_IMAGE_WIDTH = 200;

@customElement("hui-dialog-web-browser-play-media")
export class HuiDialogWebBrowserPlayMedia extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: WebBrowserPlayMediaDialogParams;

  @state() private _open = false;

  @state() private _imageLoading = true;

  // Size of the picture on screen, not known until the first one has loaded
  @state() private _imageSize?: { width: number; height: number };

  @state() private _imageIndex = -1;

  @query("img") private _img?: HTMLImageElement;

  public showDialog(params: WebBrowserPlayMediaDialogParams): void {
    this._params = params;
    this._imageLoading = true;
    this._imageSize = undefined;
    this._imageIndex = params.imageIndex ?? -1;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    if (this._img) {
      // Unload streaming images so the connection can be closed
      this._img.src = "";
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _imageLoaded(ev: Event): void {
    const { naturalWidth, naturalHeight } = ev.target as HTMLImageElement;
    // A picture without a size of its own (some SVGs) is left to the browser
    this._imageSize =
      naturalWidth && naturalHeight
        ? { width: naturalWidth, height: naturalHeight }
        : undefined;
    this._imageLoading = false;
  }

  private _imageFailed(): void {
    this._imageSize = undefined;
    this._imageLoading = false;
  }

  private get _hasImageNavigation(): boolean {
    return this._imageIndex >= 0 && (this._params?.images?.length ?? 0) > 1;
  }

  private _showPreviousImage(): void {
    this._showImage(this._imageIndex - 1);
  }

  private _showNextImage(): void {
    this._showImage(this._imageIndex + 1);
  }

  // Clicking an arrow must not move the focus to it. Otherwise the next arrow
  // key press would draw a focus ring on the button, and the focus would be lost
  // when the button is disabled at the first or last picture.
  private _keepFocus(ev: MouseEvent): void {
    ev.preventDefault();
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (!this._hasImageNavigation) {
      return;
    }
    if (ev.key === "ArrowLeft") {
      this._showPreviousImage();
    } else if (ev.key === "ArrowRight") {
      this._showNextImage();
    }
  }

  private async _showImage(index: number): Promise<void> {
    const item = this._params?.images?.[index];
    if (!item) {
      return;
    }
    const previousIndex = this._imageIndex;
    this._imageIndex = index;
    this._imageLoading = true;

    let resolved: ResolvedMediaSource;
    try {
      resolved = await resolveMediaSource(this.hass, item.media_content_id);
    } catch (err: any) {
      if (this._imageIndex === index) {
        this._imageIndex = previousIndex;
        this._imageLoading = false;
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.components.media-browser.media_browsing_error"
          ),
          text: err.message,
        });
      }
      return;
    }

    // Another picture was asked for, or the dialog closed, while resolving
    if (!this._params || this._imageIndex !== index) {
      return;
    }
    this._params = {
      ...this._params,
      sourceUrl: this.hass.hassUrl(resolved.url),
      sourceType: resolved.mime_type,
      title: item.title,
    };
  }

  // A picture is shown at its own size: the dialog is as wide as the picture
  // (plus its padding) but never wider than a large dialog. Until the first
  // picture has loaded it is as wide as the spinner, and it keeps the width of
  // the last picture while the next one loads.
  private _imageDialogStyle() {
    if (!this._imageLoading && !this._imageSize) {
      return {};
    }
    const pictureWidth = Math.max(this._imageSize?.width ?? 0, MIN_IMAGE_WIDTH);
    return {
      "--ha-dialog-resize-duration": "var(--ha-animation-duration-normal)",
      "--ha-dialog-width-lg": `min(calc(${pictureWidth}px + 2 * var(--ha-space-6)), ${LARGE_DIALOG_WIDTH}px)`,
    };
  }

  private _renderImageNavigation() {
    if (!this._hasImageNavigation) {
      return nothing;
    }
    const lastIndex = this._params!.images!.length - 1;
    return html`
      <ha-icon-button-prev
        slot="headerActionItems"
        .label=${this.hass.localize("ui.common.previous")}
        .disabled=${this._imageIndex <= 0}
        @mousedown=${this._keepFocus}
        @click=${this._showPreviousImage}
      ></ha-icon-button-prev>
      <ha-icon-button-next
        slot="headerActionItems"
        .label=${this.hass.localize("ui.common.next")}
        .disabled=${this._imageIndex >= lastIndex}
        @mousedown=${this._keepFocus}
        @click=${this._showNextImage}
      ></ha-icon-button-next>
    `;
  }

  // The picture box gets the size of the picture, and the height follows from
  // its ratio. Both are animated, so the dialog also changes its height
  // smoothly, which it cannot do from the content alone.
  private _pictureStyle() {
    if (!this._imageSize) {
      return {};
    }
    const { width, height } = this._imageSize;
    return { width: `${width}px`, "aspect-ratio": `${width} / ${height}` };
  }

  private _renderImage(params: WebBrowserPlayMediaDialogParams) {
    const hasPicture = this._imageSize !== undefined;
    return html`
      <div
        class=${classMap({ picture: true, placeholder: !hasPicture })}
        style=${styleMap(this._pictureStyle())}
      >
        ${
          this._imageLoading
            ? html`<ha-spinner class="spinner"></ha-spinner>`
            : nothing
        }
        <img
          class=${classMap({ loading: this._imageLoading })}
          alt=${params.title || nothing}
          src=${params.sourceUrl}
          ?hidden=${this._imageLoading && !hasPicture}
          @load=${this._imageLoaded}
          @error=${this._imageFailed}
        />
      </div>
    `;
  }

  protected render() {
    if (!this._params || !this._params.sourceType || !this._params.sourceUrl) {
      return nothing;
    }

    const mediaType = this._params.sourceType.split("/", 1)[0];

    return html`
      <ha-dialog
        .open=${this._open}
        width="large"
        style=${styleMap(mediaType === "image" ? this._imageDialogStyle() : {})}
        header-title=${
          this._params.title ||
          this.hass.localize("ui.components.media-browser.media_player")
        }
        @closed=${this._dialogClosed}
        @keydown=${this._handleKeyDown}
      >
        ${this._renderImageNavigation()}
        ${
          mediaType === "audio"
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
                      .url=${this._params.sourceUrl}
                    ></ha-hls-player>
                  `
                : mediaType === "image"
                  ? this._renderImage(this._params)
                  : html`${this.hass.localize(
                      "ui.components.media-browser.media_not_supported"
                    )}`
        }
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      animationStyles,
      css`
        video,
        audio {
          outline: none;
          width: 100%;
        }
        .picture {
          position: relative;
          max-width: 100%;
          margin: 0 auto;
          transition:
            width var(--ha-animation-duration-normal) ease,
            aspect-ratio var(--ha-animation-duration-normal) ease;
        }
        .picture.placeholder {
          min-height: var(--ha-space-20);
        }
        .spinner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          /* A picture that loads quickly never shows the spinner */
          animation: fade-in var(--ha-animation-duration-fast) ease 200ms both;
        }
        img {
          display: block;
          width: 100%;
          height: 100%;
          transition: opacity var(--ha-animation-duration-fast);
        }
        img.loading {
          opacity: 0.4;
        }
        img[hidden] {
          display: none;
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
