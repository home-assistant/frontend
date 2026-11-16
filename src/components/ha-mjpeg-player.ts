import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";

// Keeps the picture in picture video ready without costing much battery
const IDLE_FRAME_RATE = 2;

// MJPEG streams rarely send more frames than this
const PICTURE_IN_PICTURE_FRAME_RATE = 15;

/**
 * Shows an MJPEG stream as an image, like any browser can. For picture in
 * picture, which only works with a video, the image is also copied into a
 * canvas that a hidden video plays.
 */
@customElement("ha-mjpeg-player")
export class HaMjpegPlayer extends LitElement {
  @property() public src?: string;

  @property() public alt?: string;

  /** Shown until the stream sends its first frame */
  @property({ attribute: "poster-url" }) public posterUrl?: string;

  @property({ attribute: false }) public aspectRatio?: number;

  @property({ attribute: false }) public fitMode?: "cover" | "contain" | "fill";

  /** The canvas plays in the video, so it can be shown picture in picture */
  @state() private _videoReady = false;

  @query("#stream") private _imageEl?: HTMLImageElement;

  @query("video") private _videoEl?: HTMLVideoElement;

  private _canvas?: HTMLCanvasElement;

  private _stream?: MediaStream;

  private _drawInterval?: number;

  private _frameRate = IDLE_FRAME_RATE;

  @state() private _loaded = false;

  // Copying the canvas failed, like for an image from another origin
  private _captureFailed = false;

  /** The video for picture in picture, undefined until it plays. */
  public get videoElement(): HTMLVideoElement | undefined {
    return this._videoReady ? this._videoEl : undefined;
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
      ${
        this._loaded
          ? nothing
          : html`<div class="placeholder">
              ${
                this.posterUrl
                  ? html`<img .src=${this.posterUrl} alt="" />`
                  : nothing
              }
            </div>`
      }
      <img
        id="stream"
        class=${this._loaded ? "" : "loading"}
        .src=${this.src}
        alt=${this.alt ?? ""}
        style=${style}
        @load=${this._frameArrived}
      />
      <video
        muted
        playsinline
        disableremoteplayback
        aria-hidden="true"
        @enterpictureinpicture=${this._pictureInPictureChanged}
        @leavepictureinpicture=${this._pictureInPictureChanged}
      ></video>
    `;
  }

  private _frameArrived() {
    if (!this._loaded && this._imageEl?.naturalWidth) {
      this._loaded = true;
      fireEvent(this, "load");
    }
  }

  private _pictureInPictureChanged() {
    this._frameRate =
      document.pictureInPictureElement === this._videoEl
        ? PICTURE_IN_PICTURE_FRAME_RATE
        : IDLE_FRAME_RATE;
    if (this._drawInterval !== undefined) {
      this._scheduleDrawing();
    }
  }

  private _startDrawing() {
    this._stopDrawing();
    if (this._captureFailed) {
      return;
    }
    this._scheduleDrawing();
  }

  private _scheduleDrawing() {
    clearInterval(this._drawInterval);
    this._drawInterval = window.setInterval(
      () => this._drawFrame(),
      1000 / this._frameRate
    );
  }

  private _stopDrawing() {
    clearInterval(this._drawInterval);
    this._drawInterval = undefined;
    this._stream?.getTracks().forEach((track) => track.stop());
    this._stream = undefined;
    this._videoReady = false;
    if (this._videoEl) {
      this._videoEl.srcObject = null;
    }
  }

  private _drawFrame() {
    const image = this._imageEl;
    const video = this._videoEl;
    // An MJPEG stream never completes loading, so only wait for a first frame
    if (!image?.naturalWidth || !video) {
      return;
    }
    // Some browsers report no load event for the frames of a stream
    this._frameArrived();
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
      // The image only shows, without picture in picture
      this._captureFailed = true;
      this._stopDrawing();
      return;
    }
    video.srcObject = this._stream;
    video
      .play()
      .then(() => {
        this._videoReady = true;
        // Tells the player a video is there now
        fireEvent(this, "load");
      })
      .catch(() => undefined);
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    img {
      display: block;
      width: 100%;
      max-height: var(--video-max-height, calc(100vh - 97px));
    }

    /* Keeps the room of a picture until the first frame, so nothing jumps */
    .placeholder {
      aspect-ratio: 16 / 9;
      max-height: var(--video-max-height, calc(100vh - 97px));
    }

    .placeholder img {
      height: 100%;
      object-fit: contain;
    }

    /* Loads behind the placeholder, kept rendered so it keeps loading */
    img.loading,
    /* Only plays for picture in picture, kept rendered so it keeps playing */
    video {
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
