import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";

// MJPEG streams rarely send more frames than this, drawing more often only
// costs battery
const FRAME_RATE = 15;

/**
 * Plays an MJPEG stream in a video element, so it can be shown picture in
 * picture like the other camera streams. The image of the stream is copied
 * into a canvas, which is captured as the video's stream.
 *
 * Falls back to showing the image itself when the canvas can't be captured,
 * like for an image from another origin.
 */
@customElement("ha-mjpeg-player")
export class HaMjpegPlayer extends LitElement {
  @property() public src?: string;

  @property({ attribute: "poster-url" }) public posterUrl?: string;

  @property() public alt?: string;

  @property({ attribute: false }) public aspectRatio?: number;

  @property({ attribute: false }) public fitMode?: "cover" | "contain" | "fill";

  /** Shows the image instead of the captured video */
  @state() private _imageFallback = false;

  @query("img") private _imageEl?: HTMLImageElement;

  @query("video") private _videoEl?: HTMLVideoElement;

  private _canvas?: HTMLCanvasElement;

  private _stream?: MediaStream;

  private _drawInterval?: number;

  private _loaded = false;

  /** The video that plays the stream, undefined while showing the image. */
  public get videoElement(): HTMLVideoElement | undefined {
    return this._imageFallback ? undefined : (this._videoEl ?? undefined);
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._startDrawing();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._stopDrawing();
  }

  protected firstUpdated() {
    this._startDrawing();
  }

  protected render() {
    if (!this.src) {
      return nothing;
    }
    const style = styleMap({
      aspectRatio: this.aspectRatio,
      objectFit: this.fitMode,
    });
    return html`
      <img
        class=${this._imageFallback ? "" : "source"}
        .src=${this.src}
        alt=${this.alt ?? ""}
        style=${style}
        @load=${this._imageLoaded}
      />
      ${
        this._imageFallback
          ? nothing
          : html`<video
              autoplay
              muted
              playsinline
              disableremoteplayback
              .poster=${this.posterUrl ?? ""}
              style=${style}
            ></video>`
      }
    `;
  }

  private _imageLoaded() {
    if (this._imageFallback && !this._loaded) {
      this._loaded = true;
      fireEvent(this, "load");
    }
  }

  private _startDrawing() {
    this._stopDrawing();
    if (this._imageFallback) {
      return;
    }
    this._drawInterval = window.setInterval(
      () => this._drawFrame(),
      1000 / FRAME_RATE
    );
  }

  private _stopDrawing() {
    clearInterval(this._drawInterval);
    this._drawInterval = undefined;
    this._stream?.getTracks().forEach((track) => track.stop());
    this._stream = undefined;
    if (this._videoEl) {
      this._videoEl.srcObject = null;
    }
  }

  private _drawFrame() {
    const image = this._imageEl;
    const video = this._videoEl;
    if (!image?.complete || !image.naturalWidth || !video) {
      return;
    }
    if (!this._canvas) {
      this._canvas = document.createElement("canvas");
    }
    const canvas = this._canvas;
    if (
      canvas.width !== image.naturalWidth ||
      canvas.height !== image.naturalHeight
    ) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
    }
    canvas.getContext("2d")?.drawImage(image, 0, 0);

    if (this._stream) {
      return;
    }
    try {
      // Captures a frame whenever the canvas is drawn
      this._stream = canvas.captureStream();
    } catch (_err: unknown) {
      // An image from another origin taints the canvas, it can't be captured
      this._stopDrawing();
      this._imageFallback = true;
      this._loaded = true;
      fireEvent(this, "load");
      return;
    }
    video.srcObject = this._stream;
    video.play().catch(() => undefined);
    if (!this._loaded) {
      this._loaded = true;
      fireEvent(this, "load");
    }
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    img,
    video {
      display: block;
      width: 100%;
      max-height: var(--video-max-height, calc(100vh - 97px));
    }

    /* Only the source of the canvas, kept rendered so it keeps loading */
    img.source {
      position: absolute;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-mjpeg-player": HaMjpegPlayer;
  }
}
